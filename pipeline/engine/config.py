"""Read config/alerts.yaml through its contract (AlertsConfig). Owner: data-scientist.

`value(cfg, "weights.upstream")` returns the number or raises PendingParameter: the engine never substitutes a
default for a parameter that does not exist yet (Rule zero).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from pipeline.common.models import AlertsConfig
from pipeline.common.provenance import REPO_ROOT

ALERTS_YAML = REPO_ROOT / "config" / "alerts.yaml"


class PendingParameter(LookupError):
    """The parameter exists in config/alerts.yaml but its value is pending (null)."""


def load(path: Path = ALERTS_YAML) -> dict[str, Any]:
    """The raw mapping, after validating it against the contract."""
    with path.open(encoding="utf-8") as handle:
        raw = yaml.safe_load(handle)
    AlertsConfig.model_validate(raw)
    return raw


def param(cfg: dict[str, Any], dotted: str) -> dict[str, Any]:
    node: Any = cfg
    for key in dotted.split("."):
        if not isinstance(node, dict) or key not in node:
            raise KeyError(f"config/alerts.yaml has no parameter {dotted}")
        node = node[key]
    if not isinstance(node, dict) or "origin" not in node:
        raise KeyError(f"{dotted} is not a parameter (value/origin)")
    return node


def value(cfg: dict[str, Any], dotted: str) -> Any:
    node = param(cfg, dotted)
    if node.get("value") is None:
        raise PendingParameter(f"{dotted} is pending: {node.get('reason')}")
    return node["value"]


def value_or_none(cfg: dict[str, Any], dotted: str) -> Any:
    try:
        return value(cfg, dotted)
    except PendingParameter:
        return None


def origin(cfg: dict[str, Any], dotted: str) -> str:
    return str(param(cfg, dotted)["origin"])
