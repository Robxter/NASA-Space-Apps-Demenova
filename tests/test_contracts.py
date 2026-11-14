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
