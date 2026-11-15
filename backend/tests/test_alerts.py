"""Publishing step: Severe email dedupe, stale never emails, episode checks. All rows are synthetic fixtures."""

import logging

from backend.app.alerts import load_stale_after_hours, publish_severe_alerts
from backend.app.email import hash_recipient
from backend.tests import fakes as f

STALE_H = 12.0  # test input; production reads config/alerts.yaml (see test_config_threshold_is_readable)


def run(db: f.FakePostgrest, resend: f.FakeResend, **kw):
    s = f.settings(**kw)
    return publish_severe_alerts(db.client(), resend.mailer(s), s, stale_after_hours=STALE_H)


def setup(**state_kw) -> tuple[f.FakePostgrest, f.FakeResend]:
    db, resend = f.FakePostgrest(), f.FakeResend()
    f.seed(db)
    f.add_event(db)
    f.add_state(db, **state_kw)
    return db, resend


def test_confirmed_severe_transition_sends_one_email_and_logs_it():
    db, resend = setup()
    outcomes = run(db, resend)
    assert [o.result for o in outcomes] == ["sent"]
    assert len(resend.requests) == 1
    payload = resend.payloads[0]
    assert payload["to"] == [f.INBOX]
    assert payload["from"] == "Demenova Alerts <onboarding@resend.dev>"
    assert resend.requests[0].headers["Idempotency-Key"].startswith(f"demenova-severe-{f.LOT}-")
    (log_row,) = db.tables["email_log"]
    assert log_row["status"] == "sent" and log_row["provider_id"] == "fake-provider-id-1"
    assert log_row["to_hash"] == hash_recipient(f.INBOX) and f.INBOX not in log_row["to_hash"]
    assert db.tables["alert_events"][0]["email_sent"] is True


def test_second_run_does_not_send_again():
    db, resend = setup()
    run(db, resend)
    db.tables["alert_events"][0]["email_sent"] = False  # even if the flag were lost, email_log dedupes
    outcomes = run(db, resend)
    assert [o.result for o in outcomes] == ["skipped:duplicate"]
    assert len(resend.requests) == 1


def test_concurrent_older_claim_wins():
    db, resend = setup()
    db.tables["email_log"].append({"id": "00000000000000000000000001", "unit_id": f.LOT, "episode_start": f.T0,
                                   "to_hash": "x", "provider_id": None, "status": "queued"})
    assert [o.result for o in run(db, resend)] == ["skipped:duplicate"]
    assert resend.requests == []


def test_race_between_check_and_claim_sends_once():
    """Another process claims (older ULID) after our first check but before our insert: we back off."""
    db, resend = setup()
    original = db.handler

    def racing(request):
        if request.method == "POST" and request.url.path.endswith("/email_log"):
            db.tables["email_log"].append({"id": "00000000000000000000000001", "unit_id": f.LOT,
                                           "episode_start": f.T0, "to_hash": "x", "provider_id": None,
                                           "status": "queued"})
        return original(request)

    db.handler = racing
    assert [o.result for o in run(db, resend)] == ["skipped:duplicate"]
    assert resend.requests == []
    assert [r["id"] for r in db.tables["email_log"]] == ["00000000000000000000000001"]  # our claim removed


def test_new_episode_after_dropping_out_emails_again():
    db, resend = setup()
    run(db, resend)
    later = "2026-02-25T15:00:00Z"
    f.add_event(db, event_id="01JTEST0000000000000000002", at=later)
    db.tables["alert_states"][0].update(since=later, updated_at=later, newest_rain_data_at=later)
    assert [o.result for o in run(db, resend)] == ["sent"]
    assert len(resend.requests) == 2


def test_stale_state_never_emails():
    db, resend = setup(level="stale")
    assert [o.result for o in run(db, resend)] == ["skipped:stale"]
    assert resend.requests == [] and db.tables["email_log"] == []


def test_old_rain_data_counts_as_stale_even_if_level_says_severe():
    db, resend = setup(newest_rain="2026-02-21T00:00:00Z")
    assert [o.result for o in run(db, resend)] == ["skipped:stale"]
    db2, resend2 = setup(newest_rain=None)
    assert [o.result for o in run(db2, resend2)] == ["skipped:stale"]
    assert resend.requests == [] and resend2.requests == []


def test_missing_threshold_fails_closed(tmp_path):
    assert load_stale_after_hours(tmp_path / "missing.yaml") is None
    db, resend = setup()
    s = f.settings()
    from backend.app import alerts

    original = alerts.load_stale_after_hours
    alerts.load_stale_after_hours = lambda: None
    try:
        outcomes = publish_severe_alerts(db.client(), resend.mailer(s), s)
    finally:
        alerts.load_stale_after_hours = original
    assert [o.result for o in outcomes] == ["skipped:stale_threshold_unavailable"]


def test_config_threshold_is_readable():
    value = load_stale_after_hours()
    assert value is None or value > 0


def test_unit_no_longer_severe_or_other_episode_or_not_transition():
    db, resend = setup(level="warning")
    assert [o.result for o in run(db, resend)] == ["skipped:no_longer_severe"]
    db, resend = setup(since="2026-02-20T00:00:00Z")
    assert [o.result for o in run(db, resend)] == ["skipped:other_episode"]
    db, resend = f.FakePostgrest(), f.FakeResend()
    f.seed(db)
    f.add_event(db, from_level="severe")
    f.add_state(db)
    assert [o.result for o in run(db, resend)] == ["skipped:not_a_transition"]
    assert resend.requests == []


def test_failed_send_is_logged_and_retried_next_run():
    db, _ = setup()
    rejecting = f.FakeResend(status=403)
    assert [o.result for o in run(db, rejecting)] == ["failed"]
    assert db.tables["email_log"][0]["status"] == "failed"
    assert db.tables["alert_events"][0]["email_sent"] is False
    ok = f.FakeResend()
    assert [o.result for o in run(db, ok)] == ["sent"]


def test_non_demo_farm_without_address_is_skipped():
    db, resend = f.FakePostgrest(), f.FakeResend()
    f.seed(db, is_demo=False)
    f.add_event(db)
    f.add_state(db)
    assert [o.result for o in run(db, resend)] == ["skipped:no_recipient"]


def test_invalid_rows_and_database_errors_do_not_crash():
    db, resend = setup()
    db.tables["alert_events"][0]["w"] = "0.9"  # text number: rejected by the contract model
    assert [o.result for o in run(db, resend)] == ["skipped:invalid_event"]
    db, resend = setup()
    db.fail_tables.add("alert_states")
    assert [o.result for o in run(db, resend)] == ["skipped:supabase_error"]


def test_logs_hold_no_secret_and_no_address(caplog):
    caplog.set_level(logging.DEBUG)
    db, resend = setup()
    run(db, resend)
    for secret in (f.INBOX, f.RESEND_KEY, f.SERVICE_KEY, f.ADMIN):
        assert secret not in caplog.text


# ----------------------------------------------------------------------- security review M1 / M2 regressions


def test_lookup_failure_before_claim_leaves_no_claim_and_next_run_sends():
    db, resend = setup()
    db.fail_next[("GET", "lots")] = 1  # unit name lookup fails
    assert [o.result for o in run(db, resend)] == ["skipped:supabase_error"]
    assert db.tables["email_log"] == [] and resend.requests == []
    assert [o.result for o in run(db, resend)] == ["sent"]


def test_log_update_failure_after_send_releases_claim_and_retry_reuses_idempotency_key():
    db, resend = setup()
    db.fail_next[("PATCH", "email_log")] = 1  # status update after a successful send fails once
    assert [o.result for o in run(db, resend)] == ["failed"]
    assert [r["status"] for r in db.tables["email_log"]] == ["failed"]  # released, not stuck in queued
    assert [o.result for o in run(db, resend)] == ["sent"]
    keys = {r.headers["Idempotency-Key"] for r in resend.requests}
    assert len(resend.requests) == 2 and len(keys) == 1  # Resend dedupes the retry within 24 h


def test_claim_deleted_when_it_cannot_be_marked_failed():
    db, resend = setup()
    db.fail_next[("PATCH", "email_log")] = 2  # status update and the release update both fail
    assert [o.result for o in run(db, resend)] == ["failed"]
    assert db.tables["email_log"] == []


def test_flag_update_failure_after_send_keeps_dedupe():
    db, resend = setup()
    db.fail_next[("PATCH", "alert_events")] = 1
    assert [o.result for o in run(db, resend)] == ["sent"]
    assert [r["status"] for r in db.tables["email_log"]] == ["sent"]
    assert [o.result for o in run(db, resend)] == ["skipped:duplicate"]
    assert len(resend.requests) == 1


def test_unexpected_error_in_one_row_does_not_abort_the_batch():
    db, resend = setup()
    f.add_event(db, event_id="01JTEST0000000000000000003", unit=f.LOT2)
    f.add_state(db, unit=f.LOT2)

    class Exploding:
        def __init__(self, inner):
            self.inner, self.calls = inner, 0

        def send(self, *a, **kw):
            self.calls += 1
            if self.calls == 1:
                raise RuntimeError("provider exploded")
            return self.inner.send(*a, **kw)

    s = f.settings()
    outcomes = publish_severe_alerts(db.client(), Exploding(resend.mailer(s)), s, stale_after_hours=STALE_H)
    assert [o.result for o in outcomes] == ["failed", "sent"]
    assert sorted(r["status"] for r in db.tables["email_log"]) == ["failed", "sent"]


def test_non_supabase_error_before_claim_is_contained(monkeypatch):
    from backend.app import alerts

    db, resend = setup()
    f.add_event(db, event_id="01JTEST0000000000000000003", unit=f.LOT2)
    f.add_state(db, unit=f.LOT2)
    real = alerts.build_email

    def flaky(db_, settings_, event, *a, **kw):
        if event.unit_id == f.LOT:
            raise KeyError("name")
        return real(db_, settings_, event, *a, **kw)

    monkeypatch.setattr(alerts, "build_email", flaky)
    assert [o.result for o in run(db, resend)] == ["skipped:error", "sent"]
    assert [r["unit_id"] for r in db.tables["email_log"]] == [f.LOT2]
