"""Contract checks (ADR-005). Owner: lead-architect.

1. The generated artefacts (JSON Schemas, app/src/types/contracts.ts) match pipeline/common/models.py.
2. Every committed file listed in models.DATA_FILE_CONTRACTS validates against its model and size limit.
3. The committed demo data stays under its total size budget (CONTRACTS.md §4).
"""

import importlib.util
import json
from pathlib import Path

import pytest
import yaml
from pydantic import TypeAdapter, ValidationError

from pipeline.common import models

REPO_ROOT = Path(__file__).resolve().parent.parent


def _load_export_contracts():
    spec = importlib.util.spec_from_file_location("export_contracts", REPO_ROOT / "scripts" / "export_contracts.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def _committed_data_files() -> list[tuple[models.DataFileContract, Path]]:
    found = []
    for contract in models.DATA_FILE_CONTRACTS:
        for path in sorted(REPO_ROOT.glob(contract.pattern)):
            if path.is_file():
                found.append((contract, path))
    return found


def validate_text(model, text: str, suffix: str):
    """Validate a committed file's text. JSON goes through pydantic's JSON mode; YAML is parsed first."""
    if suffix in (".yaml", ".yml"):
        return model.model_validate(yaml.safe_load(text))
    return model.model_validate_json(text)


def test_generated_artefacts_match_the_models():
    problems = _load_export_contracts().check()
    assert problems == [], "\n".join(problems)


def test_both_config_files_exist():
    for name in ("config/alerts.yaml", "config/datasets.yaml"):
        assert (REPO_ROOT / name).is_file(), f"{name} is missing"


@pytest.mark.parametrize(
    ("contract", "path"),
    _committed_data_files(),
    ids=lambda item: item.relative_to(REPO_ROOT).as_posix() if isinstance(item, Path) else "",
)
def test_committed_data_file_matches_its_contract(contract, path):
    validate_text(contract.model, path.read_text(encoding="utf-8-sig"), path.suffix)
    if contract.max_bytes is not None:
        size = path.stat().st_size
        assert size <= contract.max_bytes, f"{size} bytes exceeds the limit of {contract.max_bytes}"


def test_demo_data_stays_under_the_total_budget():
    demo = REPO_ROOT / models.DEMO_DATA_DIR
    total = sum(path.stat().st_size for path in demo.rglob("*") if path.is_file()) if demo.exists() else 0
    assert total <= models.DEMO_DATA_MAX_TOTAL_BYTES


# --------------------------------------------------------------------------------------------------------
# Regressions from the phase 0 code review (2026-11-14). Fixtures are synthetic: no value is a measurement.
# --------------------------------------------------------------------------------------------------------


def _alert_state(**changes) -> dict:
    base = {
        "unit_id": "lot_fixture_1",
        "level": "watch",
        "w": 0.5,
        "factors": [],
        "since": "2026-11-14T00:00:00Z",
        "updated_at": "2026-11-14T00:00:00Z",
        "newest_rain_data_at": None,
        "confirmations": 0,
        "confidence": 0,
        "side": {"sigatoka": None, "cold": None},
        "origin": "synthetic",
    }
    base.update(changes)
    return base


def _param(value, origin="design") -> dict:
    return {"value": value, "origin": origin, "reason": "synthetic test fixture", "last_changed": "2026-11-14"}


def test_alert_state_fixture_is_valid():
    models.AlertState.model_validate(_alert_state())
    models.AlertState.model_validate_json(json.dumps(_alert_state()))


@pytest.mark.parametrize(
    "changes",
    [{"w": "0.5"}, {"confirmations": "1"}, {"confirmations": True}, {"factors": [{"name": "upstream", "share": "0.5"}]}],
    ids=["fraction", "int", "bool-as-int", "nested-fraction"],
)
def test_numbers_written_as_text_are_rejected(changes):
    """Review MEDIUM 4: lax mode used to coerce "0.5" into 0.5."""
    with pytest.raises(ValidationError):
        models.AlertState.model_validate(_alert_state(**changes))
    with pytest.raises(ValidationError):
        validate_text(models.AlertState, json.dumps(_alert_state(**changes)), ".json")


@pytest.mark.parametrize("value", ["1", True])
def test_data_level_written_as_text_or_bool_is_rejected(value):
    """Found while fixing review MEDIUM 4: the integer enumeration coerced "1" into a level."""
    adapter = TypeAdapter(models.DataLevelValue)
    with pytest.raises(ValidationError):
        adapter.validate_python(value)
    with pytest.raises(ValidationError):
        adapter.validate_json(json.dumps(value))
    assert adapter.validate_python(1) == models.DataLevel(1)


def test_enums_and_dates_still_accept_their_json_text():
    state = models.AlertState.model_validate(_alert_state(level="severe"))
    assert state.level == models.Severity.severe
    assert state.since.tzinfo is not None


@pytest.mark.parametrize(
    "origin",
    ["pending", {"w": "pending", "*": "synthetic"}, {"*": "pending"}],
    ids=["object-level", "map-entry", "map-default"],
)
def test_value_with_a_pending_origin_is_rejected(origin):
    """Review MEDIUM 6: pending values are null, whichever form of origin says pending."""
    with pytest.raises(ValidationError, match="pending"):
        models.AlertState.model_validate(_alert_state(origin=origin))


def test_null_value_may_be_pending_in_an_origin_map():
    models.AlertState.model_validate(_alert_state(w=None, origin={"w": "pending", "*": "synthetic"}))


@pytest.mark.parametrize("text", ["0.2", "1e-3", "45,2"])
def test_alert_parameter_written_as_text_is_rejected(text):
    """Review MEDIUM 5: a quoted number, or YAML 1.1 reading 1e-3 as a string, must not skip the checks."""
    with pytest.raises(ValidationError, match="number written as text"):
        models.AlertParam.model_validate(_param(text))


def test_pyyaml_reads_exponent_without_a_dot_as_text():
    assert yaml.safe_load("value: 1e-3")["value"] == "1e-3"


def test_weights_and_thresholds_must_be_numbers():
    words = {name: _param("high") for name in ("upstream", "saturation", "terrain", "local", "balance")}
    with pytest.raises(ValidationError, match="must be a number"):
        models.AlertWeights.model_validate(words)
    with pytest.raises(ValidationError, match="must be a number"):
        models.AlertThresholds.model_validate({name: _param("high") for name in ("watch", "warning", "severe")})


def test_text_parameters_stay_allowed():
    models.AlertParam.model_validate(_param("a written rule, not a number"))


# --------------------------------------------------------------------------------------------------------
# T-015b: telegram_code (D-017, P-002 b; mirrors supabase/migrations 200 and 400). Codes below are shapes, not data.
# --------------------------------------------------------------------------------------------------------


def _subscriber(**changes) -> dict:
    base = {
        "chat_id": "chat-fixture",
        "farm_id": "farm_fixture",
        "telegram_code": "0123456789abcdef" * 2,
        "started_at": "2026-11-14T00:00:00Z",
        "active": True,
    }
    base.update(changes)
    return base


def test_farm_telegram_code_is_optional_because_the_server_generates_it():
    field = models.Farm.model_fields["telegram_code"]
    assert not field.is_required()
    assert field.default is None


def test_telegram_subscriber_needs_the_code_it_subscribed_with():
    models.TelegramSubscriber.model_validate(_subscriber())
    without_code = {key: value for key, value in _subscriber().items() if key != "telegram_code"}
    with pytest.raises(ValidationError):
        models.TelegramSubscriber.model_validate(without_code)


@pytest.mark.parametrize("code", ["a" * 15, "a" * 65, "a" * 31 + "."], ids=["too-short", "too-long", "bad-character"])
def test_telegram_code_follows_the_database_check(code):
    with pytest.raises(ValidationError):
        TypeAdapter(models.TelegramCode).validate_python(code)
    with pytest.raises(ValidationError):
        models.TelegramSubscriber.model_validate(_subscriber(telegram_code=code))


# --------------------------------------------------------------------------------------------------------
# Contract 1.2.0 (D-030): P-015 sensitivity and experimental flag, D-025 review tags. Every field is optional,
# so files written for 1.1.0 stay valid. Fixtures are synthetic shapes: no number below is a result.
# --------------------------------------------------------------------------------------------------------

_U1, _U2, _U3 = "lot_fixture_1", "lot_fixture_2", "lot_fixture_3"


def _variant(**changes) -> dict:
    base = {
        "factor": "upstream",
        "delta": 0.25,
        "same_units": True,
        "same_days": True,
        "units_gained": [],
        "units_lost": [],
        "units_with_shifted_days": [],
        "flood_day_units": [_U1, _U2],
    }
    base.update(changes)
    return base


def _sensitivity(**changes) -> dict:
    gained = _variant(delta=-0.25, same_units=False, same_days=False, units_gained=[_U3], flood_day_units=[_U1, _U3])
    base = {
        "delta": 0.25,
        "flood_days": {"start": "2026-01-02", "end": "2026-01-03"},
        "baseline_flood_day_units": [_U1, _U2],
        "variants": [_variant(), gained],
        "stable": False,
        "flood_day_core_units": [_U1],
        "flood_day_any_units": [_U1, _U2, _U3],
        "summary": "synthetic test fixture",
    }
    base.update(changes)
    return base


def test_sensitivity_fixture_is_valid():
    models.SensitivityResult.model_validate(_sensitivity())
    models.SensitivityResult.model_validate_json(json.dumps(_sensitivity(flood_day_any_units=None, summary=None)))
    five = {name.value: 0.2 for name in models.FactorName}
    models.SensitivityResult.model_validate(_sensitivity(**_runs(_variant(weights=five), stable=True)))


def test_committed_verification_file_is_valid_with_and_without_sensitivity():
    path = REPO_ROOT / models.DEMO_DATA_DIR / "verification.json"
    if not path.is_file():
        pytest.skip("no committed verification.json")
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    assert not models.VerificationFile.model_fields["sensitivity"].is_required()
    models.VerificationFile.model_validate(data)
    models.VerificationFile.model_validate({**data, "sensitivity": _sensitivity()})


def _runs(*variants: dict, stable: bool) -> dict:
    """Changes for variants whose flood-day units equal the baseline's, so only the intended rule can fail."""
    return {"variants": list(variants), "stable": stable, "flood_day_core_units": [_U1, _U2], "flood_day_any_units": None}


@pytest.mark.parametrize(
    "changes",
    [
        {"stable": True},
        {"flood_day_core_units": [_U1, _U2]},
        {"flood_day_any_units": [_U1, _U2]},
        {"delta": 0},
        {"delta": "0.25"},
        {"stable": "false"},
        {"variants": []},
        _runs(_variant(), _variant(), stable=True),
        _runs(_variant(delta=0.1), stable=True),
        _runs(_variant(same_units=True, same_days=False, units_gained=[_U3]), stable=False),
        _runs(_variant(same_days=True, units_with_shifted_days=[_U1]), stable=True),
        _runs(_variant(weights={"upstream": 0.5}), stable=True),
        {"summary": "UNVERIFIED"},
    ],
    ids=[
        "stable-but-a-variant-differs", "core-not-in-every-run", "any-misses-a-unit", "zero-delta", "delta-as-text",
        "stable-as-text", "no-variants", "duplicate-variant", "variant-delta-differs", "same-units-with-gain",
        "same-days-with-shift", "weights-missing-factors", "unverified-summary",
    ],
)
def test_sensitivity_block_must_follow_its_own_variants(changes):
    with pytest.raises(ValidationError):
        models.SensitivityResult.model_validate(_sensitivity(**changes))


def test_side_indicators_experimental_flag_is_optional_and_strict():
    field = models.SideIndicators.model_fields["experimental"]
    assert not field.is_required() and field.default is None
    models.AlertState.model_validate(_alert_state())
    state = models.AlertState.model_validate(_alert_state(side={"sigatoka": None, "cold": None, "experimental": True}))
    assert state.side.experimental is True
    for text in ("true", 1):
        with pytest.raises(ValidationError):
            models.AlertState.model_validate(_alert_state(side={"sigatoka": None, "cold": None, "experimental": text}))


_DOMAIN_ITEMS = [models.Practice, models.Strategy, models.ActionEntry, models.GlossaryTerm, models.DomainValue, models.NumericValue]


@pytest.mark.parametrize("model", _DOMAIN_ITEMS, ids=lambda model: model.__name__)
def test_domain_items_have_optional_review_fields(model):
    for name in ("reviewed_by", "human_review"):
        field = model.model_fields[name]
        assert not field.is_required() and field.default is None, f"{model.__name__}.{name}"


def _threshold(**changes) -> dict:
    base = {"value": None, "origin": "pending", "reason": "synthetic test fixture"}
    base.update(changes)
    return base


def test_fix2_review_tags_validate_also_from_yaml():
    tags = {"reviewed_by": ["agronomist-agent", "scientist-reviewer"]}
    assert models.DomainValue.model_validate(_threshold(**tags, human_review="none")).human_review == models.HumanReview.none
    models.DomainValue.model_validate(_threshold(**tags, human_review="local-agronomist"))
    text = "thresholds:\n  fixture_key:\n    value: null\n    origin: pending\n    reason: synthetic test fixture\n" \
           "    reviewed_by: [agronomist-agent, scientist-reviewer]\n    human_review: none\n"
    parsed = validate_text(models.ThresholdsFile, text, ".yaml")
    assert parsed.thresholds["fixture_key"].human_review == models.HumanReview.none  # YAML 'none' is text, not null


@pytest.mark.parametrize(
    "changes",
    [{"human_review": "yes"}, {"reviewed_by": []}, {"reviewed_by": ["a", "a"]}, {"reviewed_by": [" "]}, {"reviewed_by": "agronomist-agent"}],
    ids=["unknown-review", "empty-list", "duplicate", "blank-name", "not-a-list"],
)
def test_review_tags_reject_malformed_values(changes):
    with pytest.raises(ValidationError):
        models.DomainValue.model_validate(_threshold(**changes))
