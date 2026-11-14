#!/usr/bin/env python3
"""Demenova provenance checker: the Rule-zero gate for data files (CLAUDE.md §1, docs/DATA_POLICY.md).

Scans `pipeline/data/**` and `app/public/data/**` and exits non-zero when

  1. a data file has no provenance block, or
  2. a file contains a number whose origin is missing, unknown or `pending`.

Every file under a scanned folder is a data file except `.gitkeep`, including dotfiles and files in
dot-folders. A Zarr store (`*.zarr/`) is one data file: its contents are not read and it needs a sidecar.
Naming a single file also checks the sidecar next to it. A file is checked once, however often it is named.

It uses the standard library only, so `python scripts/check_provenance.py` runs anywhere: in CI, before a
commit, on a machine without the project's virtual environment.

Provenance block (docs/contracts/CONTRACTS.md §8.2)
  - JSON, GeoJSON and TopoJSON: a top-level `provenance` member, or a sidecar file
    `<file name>.provenance.json` next to the file (for raw downloads that must stay byte-identical).
  - CSV and TSV: always the sidecar. Any other file type and Zarr stores: always the sidecar.
  - A reference may only point at a manifest inside the folder being scanned (for a single named file:
    the default data folder holding it, else the file's own folder).
  - A block is one record, a non-empty list of records, or a reference
    {"ref": "<path of a manifest JSON>", "ids": ["prov-..."]} to records embedded in that manifest.
  - A record has the fourteen keys of docs/DATA_POLICY.md §3. It cites a dataset completely (dataset,
    version, provider, url, accessed) or has `dataset: null` and explains the content in `notes`.
    UNVERIFIED and unfilled <placeholders> never pass.

Origin of every number (docs/contracts/CONTRACTS.md §8.1)
  For the value under key K of an object, the first of these that exists:
    1. the sibling `K_origin`   (a string, or an array parallel to an array value)
    2. `origin[K]`, then `origin["*"]`, when `origin` is a map
    3. `origin` when it is a string
    4. the origin that applies to the enclosing object
  In a GeoJSON Feature, `geometry` and `bbox` take their origin from `properties`.
  The keys `origin` and `<name>_origin` are reserved for this purpose.
  A missing value is `null`; NaN and Infinity are rejected.
  A number written as text ("45.2", "45,2", "1,234.5", "1e-3", "45.2mm") is a number and needs an origin.
  CSV: the delimiter is detected among , ; tab and |; the first row must be a header (not all numbers);
  a row may not have more cells than the header; every cell holding a digit is a number unless it is an
  ISO 8601 date or timestamp.

Usage
    python scripts/check_provenance.py                  scan the two default directories
    python scripts/check_provenance.py PATH [PATH...]   scan other directories or single files

Exit codes: 0 no violation, 1 at least one violation, 2 bad arguments.
Owner: lead-architect. Tests: tests/test_provenance.py.
"""

import argparse
import csv
import io
import json
import math
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ROOTS = ("pipeline/data", "app/public/data")
SIDECAR_SUFFIX = ".provenance.json"
ORIGINS = ("sourced", "calibrated", "provided", "observed", "estimated", "synthetic", "design", "pending")
RECORD_KEYS = (
    "id",
    "dataset",
    "version",
    "provider",
    "url",
    "accessed",
    "spatial_resolution",
    "temporal_resolution",
    "aoi",
    "time_range",
    "processing",
    "code_commit",
    "agent",
    "notes",
)
MAX_ORIGIN_PROBLEMS_PER_FILE = 20
JSON_SUFFIXES = (".json", ".geojson", ".topojson")
CSV_SUFFIXES = (".csv", ".tsv")
SKIPPED_NAMES = (".gitkeep",)
CSV_DELIMITERS = ",;\t|"

_ID = re.compile(r"^prov-[A-Za-z0-9][A-Za-z0-9._-]*$")
# Text that is a number: sign, digits with optional thousands separators, a '.' or ',' decimal part, an
# exponent, and an optional short unit ("45.2", "45,2", "1,234.5", "1 234", "1e-3", "45.2mm", "3 ha").
_NUMBER_TEXT = re.compile(r"^\s*[+-]?(?:\d+(?:[ ,.'_]\d{3})*(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+)?(?:\s*[^\d\s]{1,6})?\s*$")
_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$")
_DIGIT = re.compile(r"[0-9]")
_ACCESSED = re.compile(r"^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|\+00:00))?$")
_ORIGIN_LIST = ", ".join(ORIGINS)


class Report:
    """Collects violations and counts what was checked."""

    def __init__(self) -> None:
        self.violations: list[tuple[Path, str]] = []
        self.data_files = 0
        self.sidecars = 0
        self.skipped_roots: list[Path] = []

    def add(self, path: Path, message: str) -> None:
        self.violations.append((path, message))

    @property
    def ok(self) -> bool:
        return not self.violations


# --------------------------------------------------------------------------------------------------------
# Reading files
# --------------------------------------------------------------------------------------------------------


def _reject_constant(name: str) -> Any:
    raise ValueError(f"non-finite number literal {name}: write null for a missing value")


def load_json(path: Path) -> Any:
    """Parse strict JSON (UTF-8, optional BOM). NaN and Infinity raise ValueError."""
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle, parse_constant=_reject_constant)


def _sidecar_of(path: Path) -> Path:
    return path.with_name(path.name + SIDECAR_SUFFIX)


def _is_sidecar(path: Path) -> bool:
    return path.name.lower().endswith(SIDECAR_SUFFIX)


def _text(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


def _unverified(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    text = value.strip()
    return "UNVERIFIED" in text.upper() or (text.startswith("<") and text.endswith(">"))


# --------------------------------------------------------------------------------------------------------
# Provenance blocks
# --------------------------------------------------------------------------------------------------------


def record_problems(record: Any) -> list[str]:
    """Problems of one provenance record (docs/DATA_POLICY.md §3); an empty list means it is valid."""
    if not isinstance(record, dict):
        return ["a provenance record must be an object"]
    problems: list[str] = []
    missing = [key for key in RECORD_KEYS if key not in record]
    if missing:
        problems.append("provenance record lacks: " + ", ".join(missing))
    identifier = record.get("id")
    if not isinstance(identifier, str) or not _ID.match(identifier):
        problems.append("provenance id must look like prov-<name>")
    if not _text(record.get("agent")):
        problems.append("provenance agent is empty")
    processing = record.get("processing")
    if not isinstance(processing, list) or any(not isinstance(step, str) for step in processing):
        problems.append("provenance processing must be a list of strings")
    for key in ("dataset", "version", "provider", "url", "spatial_resolution", "temporal_resolution", "aoi", "agent"):
        if _unverified(record.get(key)):
            problems.append(f"provenance {key} is UNVERIFIED or an unfilled placeholder")
    if record.get("dataset") is None:
        if not _text(record.get("notes")):
            problems.append("provenance has dataset null, so notes must say what the content is")
    else:
        for key in ("dataset", "version", "provider", "url"):
            if not _text(record.get(key)):
                problems.append(f"dataset-backed provenance needs a non-empty {key}")
        accessed = record.get("accessed")
        if not isinstance(accessed, str) or not _ACCESSED.match(accessed):
            problems.append("dataset-backed provenance needs accessed as a UTC date or timestamp")
    time_range = record.get("time_range")
    if time_range is not None and not (
        isinstance(time_range, list) and len(time_range) == 2 and all(isinstance(item, str) for item in time_range)
    ):
        problems.append("provenance time_range must be [start, end] or null")
    return problems


def _records_problems(records: list[Any]) -> list[str]:
    problems: list[str] = []
    seen: set[str] = set()
    for index, record in enumerate(records):
        problems.extend(f"provenance[{index}]: {problem}" for problem in record_problems(record))
        identifier = record.get("id") if isinstance(record, dict) else None
        if isinstance(identifier, str):
            if identifier in seen:
                problems.append(f"provenance[{index}]: duplicate id {identifier}")
            seen.add(identifier)
    return problems


def _manifest_records(target: Path) -> dict[str, list[str]] | str:
    """Map record id -> problems for the records embedded in a manifest, or an error message."""
    if not target.is_file():
        return "manifest not found"
    try:
        manifest = load_json(target)
    except (OSError, ValueError) as error:
        return f"manifest cannot be read ({error})"
    block = manifest.get("provenance") if isinstance(manifest, dict) else None
    if isinstance(block, dict) and "ref" not in block:
        block = [block]
    if not isinstance(block, list) or not block:
        return "manifest must embed its provenance records, not refer to another file"
    records: dict[str, list[str]] = {}
    for record in block:
        identifier = record.get("id") if isinstance(record, dict) else None
        if isinstance(identifier, str):
            records[identifier] = record_problems(record)
    return records


def block_problems(block: Any, holder: Path, manifests: dict[Path, Any], boundary: Path | None = None) -> list[str]:
    """Problems of the provenance block held by `holder` (a data file or a sidecar).

    `boundary` is the resolved folder being scanned; a reference may not reach a manifest outside it.
    """
    if isinstance(block, dict) and "ref" in block:
        ref, ids = block.get("ref"), block.get("ids")
        if not _text(ref):
            return ["provenance.ref must be the relative path of a manifest JSON"]
        if not isinstance(ids, list) or not ids or any(not isinstance(item, str) for item in ids):
            return ["provenance.ids must be a non-empty list of record ids"]
        target = (holder.parent / ref).resolve()
        if boundary is None:
            boundary = holder.parent.resolve()
        if not target.is_relative_to(boundary):
            return [f"provenance.ref '{ref}' points outside the scanned folder"]
        if target not in manifests:
            manifests[target] = _manifest_records(target)
        records = manifests[target]
        if isinstance(records, str):
            return [f"provenance.ref '{ref}': {records}"]
        problems = []
        for identifier in ids:
            if identifier not in records:
                problems.append(f"provenance id {identifier} is not in '{ref}'")
            elif records[identifier]:
                problems.append(f"provenance id {identifier} in '{ref}' is invalid: {records[identifier][0]}")
        return problems
    if isinstance(block, dict):
        return record_problems(block)
    if isinstance(block, list) and block:
        return _records_problems(block)
    return ["provenance must be a record, a non-empty list of records, or a reference {ref, ids}"]


# --------------------------------------------------------------------------------------------------------
# Origins
# --------------------------------------------------------------------------------------------------------


class _Parallel:
    """Per-element origins for an array value (`K_origin` given as an array)."""

    def __init__(self, origins: list[Any]) -> None:
        self.origins = origins


def spec_problems(spec: Any, where: str) -> list[str]:
    """Problems of an `origin` value: a string origin or a map from field name to origin."""
    if isinstance(spec, str):
        if spec not in ORIGINS:
            return [f"{where}: origin '{spec}' is not one of: {_ORIGIN_LIST}"]
        return []
    if isinstance(spec, dict):
        return [
            f"{where}.{key}: origin {value!r} is not one of: {_ORIGIN_LIST}"
            for key, value in spec.items()
            if not (isinstance(value, str) and value in ORIGINS)
        ]
    return [f"{where}: 'origin' is reserved for the data origin (a string or a map); rename the key if it means something else"]


def _metadata_problems(node: dict[str, Any], where: str) -> list[str]:
    problems: list[str] = []
    for key, value in node.items():
        if key == "origin":
            problems.extend(spec_problems(value, f"{where}.origin"))
        elif key.endswith("_origin"):
            target = key[: -len("_origin")]
            if value is None:
                continue
            if isinstance(value, str):
                if value not in ORIGINS:
                    problems.append(f"{where}.{key}: origin '{value}' is not one of: {_ORIGIN_LIST}")
            elif isinstance(value, list):
                values = node.get(target)
                if not isinstance(values, list) or len(values) != len(value):
                    problems.append(f"{where}.{key}: an origin array must match the length of '{target}'")
                elif any(item is not None and item not in ORIGINS for item in value):
                    problems.append(f"{where}.{key}: every entry must be null or one of: {_ORIGIN_LIST}")
            else:
                problems.append(f"{where}.{key}: '<name>_origin' is reserved for the data origin of '<name>'")
    return problems


def _resolve(node: dict[str, Any], key: str, inherited: Any) -> Any:
    sibling = node.get(f"{key}_origin")
    if isinstance(sibling, str):
        return sibling
    if isinstance(sibling, list):
        return _Parallel(sibling)
    spec = node.get("origin")
    if isinstance(spec, dict):
        if key in spec:
            return spec[key]
        if "*" in spec:
            return spec["*"]
    elif isinstance(spec, str):
        return spec
    return inherited


def _walk(node: Any, origin: Any, where: str, problems: list[str], top: bool = False) -> None:
    if len(problems) >= MAX_ORIGIN_PROBLEMS_PER_FILE:
        return
    if isinstance(node, dict):
        problems.extend(_metadata_problems(node, where))
        inherited = None if isinstance(origin, _Parallel) else origin
        properties = node.get("properties")
        is_feature = node.get("type") == "Feature" and isinstance(properties, dict)
        for key, value in node.items():
            if key == "origin" or key.endswith("_origin") or (top and key == "provenance"):
                continue
            if is_feature and key in ("geometry", "bbox"):
                effective = _resolve(node, key, None)
                if effective is None:
                    effective = _resolve(properties, key, inherited)
            else:
                effective = _resolve(node, key, inherited)
            _walk(value, effective, f"{where}.{key}", problems)
    elif isinstance(node, list):
        if isinstance(origin, _Parallel):
            if len(origin.origins) != len(node):
                return  # already reported by _metadata_problems
            for index, (item, item_origin) in enumerate(zip(node, origin.origins)):
                _walk(item, item_origin, f"{where}[{index}]", problems)
        else:
            for index, item in enumerate(node):
                _walk(item, origin, f"{where}[{index}]", problems)
    elif isinstance(node, (int, float)) and not isinstance(node, bool):
        problem = number_problem(node, origin)
        if problem:
            problems.append(f"{where}: {problem}")
    elif isinstance(node, str) and is_number_text(node):
        problem = origin_problem(origin)
        if problem:
            problems.append(f"{where}: number written as text {node!r}: {problem}")


def is_number_text(text: str) -> bool:
    """True for text that holds a number ("45.2", "45,2", "1,234.5", "1e-3", "45.2mm"); dates are not numbers."""
    return bool(_NUMBER_TEXT.match(text)) and not _ISO_DATE.match(text.strip())


def origin_problem(origin: Any) -> str | None:
    """Why a value cannot rest on this origin, or None when it can."""
    if not isinstance(origin, str) or origin == "":
        return "number without an origin"
    if origin not in ORIGINS:
        return f"origin '{origin}' is not one of: {_ORIGIN_LIST}"
    if origin == "pending":
        return "has a value, but its origin is 'pending' (pending values are null)"
    return None


def number_problem(value: float, origin: Any) -> str | None:
    """Why a number is not acceptable with the origin that applies to it, or None when it is."""
    if isinstance(value, float) and not math.isfinite(value):
        return "non-finite number: write null for a missing value"
    return origin_problem(origin)


def origin_problems(data: Any, file_origin: Any = None) -> list[str]:
    """Problems with the origins inside one parsed JSON document.

    `file_origin` is the `origin` of the sidecar, if any: it applies to the whole file unless the file
    carries its own.
    """
    problems: list[str] = []
    inherited: Any = None
    if file_origin is not None:
        problems.extend(spec_problems(file_origin, "sidecar.origin"))
        if problems:
            file_origin = None  # an invalid sidecar origin gives no origin to anything
        elif isinstance(data, dict) and "origin" not in data:
            data = {**data, "origin": file_origin}
        elif isinstance(file_origin, str):
            inherited = file_origin
        else:
            inherited = file_origin.get("*")
    _walk(data, inherited, "$", problems, top=True)
    if len(problems) >= MAX_ORIGIN_PROBLEMS_PER_FILE:
        problems = problems[:MAX_ORIGIN_PROBLEMS_PER_FILE]
        problems.append(f"more origin problems not shown (limit {MAX_ORIGIN_PROBLEMS_PER_FILE} per file)")
    return problems


# --------------------------------------------------------------------------------------------------------
# File checks
# --------------------------------------------------------------------------------------------------------


def _load_sidecar(path: Path) -> dict[str, Any] | None:
    """The parsed sidecar of a data file, or None when there is none or it is unusable."""
    sidecar = _sidecar_of(path)
    if not sidecar.is_file():
        return None
    try:
        content = load_json(sidecar)
    except (OSError, ValueError):
        return None  # reported when the sidecar itself is checked
    return content if isinstance(content, dict) else None


def check_sidecar(path: Path, report: Report, manifests: dict[Path, Any], boundary: Path | None = None) -> None:
    report.sidecars += 1
    companion = path.with_name(path.name[: -len(SIDECAR_SUFFIX)])
    if not companion.exists():
        report.add(path, f"sidecar without its data file '{companion.name}'")
    try:
        content = load_json(path)
    except (OSError, ValueError) as error:
        report.add(path, f"cannot be read as JSON: {error}")
        return
    if not isinstance(content, dict) or "provenance" not in content:
        report.add(path, "a sidecar must be an object with a 'provenance' member")
        return
    for problem in block_problems(content["provenance"], path, manifests, boundary):
        report.add(path, problem)


def check_json(path: Path, report: Report, manifests: dict[Path, Any], boundary: Path | None = None) -> None:
    report.data_files += 1
    try:
        data = load_json(path)
    except (OSError, ValueError) as error:
        report.add(path, f"cannot be read as JSON: {error}")
        return
    has_sidecar = _sidecar_of(path).is_file()
    if isinstance(data, dict) and "provenance" in data:
        for problem in block_problems(data["provenance"], path, manifests, boundary):
            report.add(path, problem)
    elif not has_sidecar:
        report.add(path, f"no provenance block: add a top-level 'provenance' member or the sidecar '{path.name}{SIDECAR_SUFFIX}'")
    sidecar = _load_sidecar(path)
    file_origin = sidecar.get("origin") if sidecar else None
    for problem in origin_problems(data, file_origin):
        report.add(path, problem)


def _csv_number(cell: str) -> float | None:
    text = cell.strip()
    if text == "":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def sniff_delimiter(text: str) -> str:
    """The delimiter of a CSV text, among , ; tab and |. Defaults to ',' for a single-column file."""
    sample = text[:65536]
    first_line = sample.split("\n", 1)[0]
    counts = sorted(((first_line.count(mark), -order, mark) for order, mark in enumerate(CSV_DELIMITERS)), reverse=True)
    from_header = counts[0][2] if counts[0][0] > 0 else None
    try:
        sniffed = csv.Sniffer().sniff(sample, delimiters=CSV_DELIMITERS).delimiter
    except csv.Error:
        sniffed = None
    if sniffed and (sniffed in first_line or from_header is None):
        return sniffed
    return from_header or ","


def _csv_cell_is_number(text: str) -> bool:
    """A CSV cell holding a digit is a number unless it is an ISO 8601 date or timestamp."""
    return bool(_DIGIT.search(text)) and not _ISO_DATE.match(text)


def check_csv(path: Path, report: Report) -> None:
    report.data_files += 1
    sidecar = _load_sidecar(path)
    if not _sidecar_of(path).is_file():
        report.add(path, f"no provenance block: a CSV needs the sidecar '{path.name}{SIDECAR_SUFFIX}'")
    spec = sidecar.get("origin") if sidecar else None
    problems: list[str] = []
    if spec is not None:
        problems.extend(spec_problems(spec, "sidecar.origin"))
    try:
        text = path.read_text(encoding="utf-8-sig")
        rows = list(csv.reader(io.StringIO(text, newline=""), delimiter=sniff_delimiter(text)))
    except (OSError, ValueError, csv.Error) as error:
        report.add(path, f"cannot be read as CSV: {error}")
        return
    header = [name.strip() for name in rows[0]] if rows else []
    named = [name for name in header if name]
    if named and all(is_number_text(name) for name in named):
        problems.append("line 1: every cell is a number, so the file has no header row naming the columns")
    elif header:
        column = {name: index for index, name in enumerate(header)}
        for line, row in enumerate(rows[1:], start=2):
            if len(problems) >= MAX_ORIGIN_PROBLEMS_PER_FILE:
                problems.append(f"more origin problems not shown (limit {MAX_ORIGIN_PROBLEMS_PER_FILE} per file)")
                break
            if len(row) > len(header):
                problems.append(f"line {line}: {len(row)} cells, but the header names {len(header)} column(s)")
                continue
            for index, cell in enumerate(row):
                name = header[index]
                where = f"line {line}, column '{name}'"
                value = cell.strip()
                if name == "origin" or name.endswith("_origin"):
                    if value and value not in ORIGINS:
                        problems.append(f"{where}: origin '{value}' is not one of: {_ORIGIN_LIST}")
                    continue
                number = _csv_number(value)
                if number is not None and not math.isfinite(number):
                    problems.append(f"{where}: non-finite number: write null for a missing value")
                    continue
                if number is None and not _csv_cell_is_number(value):
                    continue
                origin: Any = None
                for origin_column in (f"{name}_origin", "origin"):
                    position = column.get(origin_column)
                    if position is not None and position < len(row) and row[position].strip():
                        origin = row[position].strip()
                        break
                if origin is None and isinstance(spec, dict):
                    origin = spec.get(name, spec.get("*"))
                elif origin is None and isinstance(spec, str):
                    origin = spec
                problem = origin_problem(origin)
                if problem:
                    problems.append(f"{where}: {problem}")
    for problem in problems:
        report.add(path, problem)


def _is_zarr_store(path: Path) -> bool:
    return path.is_dir() and path.name.lower().endswith(".zarr")


def check_other(path: Path, report: Report) -> None:
    """A data file the checker cannot read (binary, Zarr store, other text formats): it needs a sidecar."""
    report.data_files += 1
    if _sidecar_of(path).is_file():
        return
    if _is_zarr_store(path):
        report.add(path, f"no provenance block: the Zarr store '{path.name}' needs the sidecar '{path.name}{SIDECAR_SUFFIX}'")
    else:
        report.add(path, f"no provenance block: '{path.name}' is not JSON or CSV, so it needs the sidecar '{path.name}{SIDECAR_SUFFIX}'")


def iter_files(root: Path):
    """Yield the data files under `root`: every file except .gitkeep, and each Zarr store as one entry.

    A single named file yields itself and then its sidecar, when there is one.
    """
    if root.is_file() or _is_zarr_store(root):
        yield root
        if not _is_sidecar(root) and _sidecar_of(root).is_file():
            yield _sidecar_of(root)
        return
    for path in sorted(root.rglob("*")):
        parents = path.relative_to(root).parts[:-1]
        if any(part.lower().endswith(".zarr") for part in parents):
            continue  # inside a Zarr store, which is checked as one entry
        if _is_zarr_store(path) or (path.is_file() and path.name not in SKIPPED_NAMES):
            yield path


def _boundary(root: Path) -> Path:
    """The folder a provenance reference must stay inside when `root` is scanned."""
    resolved = root.resolve()
    if root.is_dir() and not _is_zarr_store(root):
        return resolved
    for item in DEFAULT_ROOTS:
        base = (REPO_ROOT / item).resolve()
        if resolved.is_relative_to(base):
            return base
    return resolved.parent


def check_paths(roots: list[Path]) -> Report:
    """Check every data file and sidecar under the given directories or files, each file once."""
    report = Report()
    manifests: dict[Path, Any] = {}
    seen: set[Path] = set()
    for root in roots:
        if not root.exists():
            report.skipped_roots.append(root)
            continue
        boundary = _boundary(root)
        for path in iter_files(root):
            key = path.resolve()
            if key in seen:
                continue
            seen.add(key)
            suffix = path.suffix.lower()
            if _is_sidecar(path):
                check_sidecar(path, report, manifests, boundary)
            elif path.is_file() and suffix in JSON_SUFFIXES:
                check_json(path, report, manifests, boundary)
            elif path.is_file() and suffix in CSV_SUFFIXES:
                check_csv(path, report)
            else:
                check_other(path, report)
    return report


# --------------------------------------------------------------------------------------------------------
# Command line
# --------------------------------------------------------------------------------------------------------


def _display(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fail when a data file lacks a provenance block or holds a number without an origin."
    )
    parser.add_argument("paths", nargs="*", help="directories or files to scan (default: pipeline/data and app/public/data)")
    parser.add_argument("-q", "--quiet", action="store_true", help="print violations and the summary only")
    args = parser.parse_args(argv)

    reconfigure = getattr(sys.stdout, "reconfigure", None)
    if callable(reconfigure):
        reconfigure(errors="backslashreplace")

    if args.paths:
        roots = [Path(item) for item in args.paths]
        absent = [root for root in roots if not root.exists()]
        if absent:
            parser.error("path does not exist: " + ", ".join(str(root) for root in absent))
    else:
        roots = [REPO_ROOT / item for item in DEFAULT_ROOTS]

    report = check_paths(roots)
    if not args.quiet:
        for root in report.skipped_roots:
            print(f"check_provenance: skipped {_display(root)} (directory does not exist)")
    for path, message in report.violations:
        print(f"FAIL {_display(path)}: {message}")
    scanned = ", ".join(_display(root) for root in roots)
    counted = f"{report.data_files} data file(s), {report.sidecars} sidecar(s) in {scanned}"
    if report.ok:
        print(f"check_provenance: OK - {counted}")
        return 0
    failed_files = len({path for path, _ in report.violations})
    print(f"check_provenance: FAILED - {len(report.violations)} violation(s) in {failed_files} file(s); {counted}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
