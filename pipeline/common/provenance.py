"""Provenance records (docs/DATA_POLICY.md §3, CONTRACTS.md §8.2). Owner: data-engineer (T-019).

Every record has the fourteen keys. Dataset-backed records take their identifiers from config/datasets.yaml, so a
file can only cite what T-010 verified; a key whose entry is still `pending` raises instead of shipping a guess.
"""

from __future__ import annotations

import datetime as dt
import json
import subprocess
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
DATASETS_YAML = REPO_ROOT / "config" / "datasets.yaml"
SIDECAR_SUFFIX = ".provenance.json"
AGENT = "data-engineer"


class UnverifiedDatasetError(RuntimeError):
    """Raised when code tries to cite a dataset whose config entry is not `sourced`."""


@lru_cache(maxsize=1)
def git_commit() -> str | None:
    """Short HEAD sha, suffixed '+uncommitted' when the work tree has changes; None outside git."""
    try:
        sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO_ROOT, capture_output=True, text=True, check=True).stdout.strip()
        dirty = subprocess.run(["git", "status", "--porcelain"], cwd=REPO_ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None
    return f"{sha}+uncommitted" if dirty else sha


def load_datasets(path: Path = DATASETS_YAML) -> dict[str, dict[str, Any]]:
    with path.open(encoding="utf-8") as handle:
        return {entry["key"]: entry for entry in yaml.safe_load(handle)["datasets"]}


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (dt.date, dt.datetime)):
        return value.isoformat()
    return str(value)


def record(
    rid: str,
    *,
    processing: Iterable[str],
    aoi: str | None,
    time_range: tuple[str, str] | None,
    notes: str,
    dataset: str | None = None,
    version: str | None = None,
    provider: str | None = None,
    url: str | None = None,
    accessed: str | None = None,
    spatial_resolution: str | None = None,
    temporal_resolution: str | None = None,
) -> dict[str, Any]:
    """A complete provenance record. `rid` must start with 'prov-'."""
    if not rid.startswith("prov-"):
        raise ValueError("provenance id must start with 'prov-'")
    return {
        "id": rid,
        "dataset": dataset,
        "version": version,
        "provider": provider,
        "url": url,
        "accessed": accessed,
        "spatial_resolution": spatial_resolution,
        "temporal_resolution": temporal_resolution,
        "aoi": aoi,
        "time_range": list(time_range) if time_range else None,
        "processing": list(processing),
        "code_commit": git_commit(),
        "agent": AGENT,
        "notes": notes,
    }


def dataset_record(
    rid: str,
    key: str,
    *,
    processing: Iterable[str],
    aoi: str | None,
    time_range: tuple[str, str] | None,
    notes: str = "",
    accessed: str | None = None,
    url: str | None = None,
    datasets: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """A record citing the verified entry `key` of config/datasets.yaml.

    `accessed` is when the data were downloaded (defaults to now); `url` overrides url_opened when the file came
    from a different official page of the same dataset (for example the distributor's page).
    """
    entries = datasets if datasets is not None else load_datasets()
    entry = entries.get(key)
    if entry is None or entry.get("origin") != "sourced":
        raise UnverifiedDatasetError(f"dataset '{key}' is not verified in config/datasets.yaml; add it to PENDING.md instead")
    return record(
        rid,
        dataset=entry["short_name"],
        version=_as_text(entry["version"]) or "not stated by provider",
        provider=entry["provider"],
        url=url or entry["url_opened"],
        accessed=accessed or utc_now(),
        spatial_resolution=entry["spatial_res"],
        temporal_resolution=entry["temporal_res"],
        aoi=aoi,
        time_range=time_range,
        processing=processing,
        notes=notes,
    )


def sidecar_path(path: Path) -> Path:
    return path.with_name(path.name + SIDECAR_SUFFIX)


def write_sidecar(path: Path, block: Any, origin: Any = None) -> Path:
    """Write `<file>.provenance.json` next to `path` with the provenance block and an optional origin spec."""
    content: dict[str, Any] = {"provenance": block}
    if origin is not None:
        content["origin"] = origin
    target = sidecar_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(content, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return target
