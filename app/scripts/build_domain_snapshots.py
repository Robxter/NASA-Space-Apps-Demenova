"""Copy the domain tables the app shows into app/public/data/demo/ as JSON (the app has no YAML parser).

Owner: frontend-engineer. Run from the repo root:  uv run python app/scripts/build_domain_snapshots.py

- strategies.json (StrategiesFile, CONTRACTS.md §4) from domain/strategies.yaml: contract fields only.
- actions.json (ActionsFile shape + provenance) from domain/actions.yaml: the check per alert level and mode.
- glossary.json (GlossaryFile shape + provenance) from domain/glossary.yaml: term, definition, origin and source
  fields only (internal `reason` notes are not shipped); terms without a definition in both languages are skipped.

Values are copied, never changed. The only text edit is the team change of 14 Nov 2026 (FIX2, D-023, D-027):
the former team agronomist is not named in the app, so a parenthetical naming him is dropped and his citation is
shown as "Team agronomist (archive), 14 Nov 2026". The script fails if his name would still reach the app; the
clean fix belongs in domain/ (agronomist agent), after which this rewrite does nothing.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "app" / "public" / "data" / "demo"
# Hex so the name the app must never render (D-027) is not written in plain text in the public repo.
NAME_HEX = "5479736f6e"
NAME = bytes.fromhex(NAME_HEX).decode()
PAREN = re.compile(r"\s*\([^()]*" + NAME + r"[^()]*\)")


def scrub(value):
    if isinstance(value, str):
        text = PAREN.sub("", value)
        text = text.replace(NAME + "'s doc (domain/" + NAME.lower() + "-answers.md)",
                            "the team agronomist's archived notes (domain/agronomist-answers-archive.md)")
        text = text.replace(NAME + "'s approval", "review by a local agronomist")
        text = re.sub(NAME + r",\s*(\d{1,2} \w+ \d{4})", r"Team agronomist (archive), \1", text)
        return text
    if isinstance(value, list):
        return [scrub(v) for v in value]
    if isinstance(value, dict):
        return {k: scrub(v) for k, v in value.items()}
    return value


def commit() -> str | None:
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except Exception:  # noqa: BLE001 - provenance keeps null when git is unavailable
        return None


def provenance(pid: str, source: str, steps: list[str]) -> dict:
    return {
        "id": pid,
        "dataset": None,
        "version": None,
        "provider": None,
        "url": None,
        "accessed": None,
        "spatial_resolution": None,
        "temporal_resolution": None,
        "aoi": None,
        "time_range": None,
        "processing": steps,
        "code_commit": commit(),
        "agent": "frontend-engineer (app/scripts/build_domain_snapshots.py)",
        "notes": f"Domain table copied from {source} for the app. Not a dataset; each item keeps its own origin. "
        "Not reviewed by a local agronomist (human_review: none).",
    }


STRATEGY_KEYS = ["strategy_id", "lot_scope", "label", "what", "why", "evidence", "benefits", "gaps", "risks",
                 "scores", "approved_by", "origin", "reviewed_by", "human_review"]
TERM_KEYS = ["term_id", "term", "definition", "origin", "source", "accessed", "approved_by", "reviewed_by", "human_review"]
ACTION_KEYS = ["level", "mode", "text", "origin", "source", "accessed", "approved_by", "reviewed_by", "human_review"]


def default(o):
    if hasattr(o, "isoformat"):
        return o.isoformat()
    raise TypeError(type(o))


def write(name: str, data: dict) -> None:
    text = json.dumps(data, ensure_ascii=False, indent=1, default=default)
    if NAME in text:
        sys.exit(f"{name}: the former team agronomist is still named; fix domain/ first")
    (OUT / name).write_text(text + "\n", encoding="utf-8")
    print(f"wrote {name} ({len(text.encode('utf-8'))} bytes)")


def main() -> None:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    strategies = yaml.safe_load((ROOT / "domain" / "strategies.yaml").read_text(encoding="utf-8"))["strategies"]
    write("strategies.json", {
        "generated_at": now,
        "provenance": provenance("prov-app-domain-strategies", "domain/strategies.yaml",
                                 ["yaml.safe_load", "keep contract fields", "drop the former agronomist's name (D-027)"]),
        "strategies": [scrub({k: s.get(k) for k in STRATEGY_KEYS if k in s}) for s in strategies],
    })
    terms = yaml.safe_load((ROOT / "domain" / "glossary.yaml").read_text(encoding="utf-8"))["terms"]
    kept = [t for t in terms if t.get("definition") and t["definition"].get("es") and t["definition"].get("en")]
    write("glossary.json", {
        "generated_at": now,
        "provenance": provenance("prov-app-domain-glossary", "domain/glossary.yaml",
                                 ["yaml.safe_load", "keep terms with a definition in both languages",
                                  "keep display fields only", "drop the former agronomist's name (D-027)"]),
        "terms": [scrub({k: t.get(k) for k in TERM_KEYS if k in t}) for t in kept],
    })


    actions = yaml.safe_load((ROOT / "domain" / "actions.yaml").read_text(encoding="utf-8"))["actions"]
    write("actions.json", {
        "generated_at": now,
        "provenance": provenance("prov-app-domain-actions", "domain/actions.yaml",
                                 ["yaml.safe_load", "keep level, mode, text and review fields",
                                  "drop the former agronomist's name (D-027)"]),
        "actions": [scrub({k: a.get(k) for k in ACTION_KEYS if k in a}) for a in actions],
    })


if __name__ == "__main__":
    main()
