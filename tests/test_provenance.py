"""Tests for scripts/check_provenance.py (mandatory, CLAUDE.md §7b).

Rule zero applies to fixtures too. Every file used here is written by the test into pytest's temporary
directory, is tagged synthetic, and names a dataset that obviously does not exist. Nothing is committed
under pipeline/data or app/public/data, and no number below is a measurement of anything.
"""

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT = REPO_ROOT / "scripts" / "check_provenance.py"


def _load_checker():
    spec = importlib.util.spec_from_file_location("check_provenance", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


cp = _load_checker()


# --------------------------------------------------------------------------------------------------------
# Synthetic fixtures
# --------------------------------------------------------------------------------------------------------


def record(**changes):
    """A dataset-backed provenance record. Synthetic fixture: the dataset and the URL do not exist."""
    base = {
        "id": "prov-fixture-a",
        "dataset": "FIXTURE-NOT-A-DATASET",
        "version": "0",
        "provider": "pytest fixture",
        "url": "https://example.invalid/fixture",
        "accessed": "2026-11-14T00:00:00Z",
        "spatial_resolution": None,
        "temporal_resolution": None,
        "aoi": None,
        "time_range": None,
        "processing": ["written by tests/test_provenance.py"],
        "code_commit": None,
        "agent": "pytest",
        "notes": "synthetic test fixture",
    }
    base.update(changes)
    return base


def record_without_dataset(**changes):
    """A record for content that comes from no dataset (synthetic demo content, user input)."""
    return record(dataset=None, version=None, provider=None, url=None, accessed=None, **changes)


def write(path: Path, content) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content if isinstance(content, str) else json.dumps(content), encoding="utf-8")
    return path


def sidecar(path: Path, block=None, **extra) -> Path:
    return write(path.with_name(path.name + ".provenance.json"), {"provenance": block or record(), **extra})


def document(**body):
    """A data file with a valid embedded provenance record and the given body."""
    return {"provenance": record(), **body}


def messages(root: Path) -> list[str]:
    return [message for _, message in cp.check_paths([root]).violations]


def feature(properties: dict, **extra) -> dict:
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": [0.0, 0.0]}, "properties": properties, **extra}


# --------------------------------------------------------------------------------------------------------
# Scanning
# --------------------------------------------------------------------------------------------------------


def test_empty_directory_passes(tmp_path):
    report = cp.check_paths([tmp_path])
    assert report.ok
    assert (report.data_files, report.sidecars) == (0, 0)


def test_directory_that_does_not_exist_is_skipped(tmp_path):
    report = cp.check_paths([tmp_path / "absent"])
    assert report.ok
    assert report.skipped_roots == [tmp_path / "absent"]


def test_only_gitkeep_is_skipped(tmp_path):
    """Review MEDIUM 2: dot-folders, dotfiles and other file types are data files too."""
    write(tmp_path / ".gitkeep", "")
    write(tmp_path / "nested" / ".gitkeep", "")
    write(tmp_path / ".cache" / "listing.json", {"count": 1})
    write(tmp_path / ".hidden.json", {"count": 1})
    for name in ("README.md", "table.tsv", "rows.ndjson", "notes.txt"):
        write(tmp_path / name, "fixture")
    report = cp.check_paths([tmp_path])
    found = [message for _, message in report.violations]
    assert report.data_files == 6
    assert "$.count: number without an origin" in found
    for name in ("README.md", "rows.ndjson", "notes.txt"):
        assert f"no provenance block: '{name}' is not JSON or CSV, so it needs the sidecar '{name}.provenance.json'" in found
    assert "no provenance block: a CSV needs the sidecar 'table.tsv.provenance.json'" in found


def test_other_file_types_pass_with_a_sidecar_and_topojson_is_read_as_json(tmp_path):
    rows = write(tmp_path / "rows.ndjson", '{"a": 1}\n')
    sidecar(rows, origin="synthetic")
    write(tmp_path / "shape.topojson", {"type": "Topology", "bbox": [0, 0, 1, 1]})
    report = cp.check_paths([tmp_path])
    assert (report.data_files, report.sidecars) == (2, 1)
    found = [message for _, message in report.violations]
    assert any(message.startswith("no provenance block: add a top-level 'provenance'") for message in found)
    assert "$.bbox[0]: number without an origin" in found


def test_zarr_store_is_one_data_file_that_needs_a_sidecar(tmp_path):
    write(tmp_path / "stack.zarr" / "zarr.json", {"zarr_format": 3})
    write(tmp_path / "stack.zarr" / "c" / "0", "chunk")
    report = cp.check_paths([tmp_path])
    assert report.data_files == 1
    assert [message for _, message in report.violations] == [
        "no provenance block: the Zarr store 'stack.zarr' needs the sidecar 'stack.zarr.provenance.json'"
    ]
    sidecar(tmp_path / "stack.zarr", origin="synthetic")
    report = cp.check_paths([tmp_path])
    assert report.ok
    assert (report.data_files, report.sidecars) == (1, 1)


def test_every_data_file_type_is_checked(tmp_path):
    write(tmp_path / "a.json", {})
    write(tmp_path / "nested" / "b.GeoJSON", {})
    write(tmp_path / "c.csv", "name\nx\n")
    report = cp.check_paths([tmp_path])
    assert report.data_files == 3
    assert len([message for _, message in report.violations if "no provenance block" in message]) == 3


# --------------------------------------------------------------------------------------------------------
# Provenance block
# --------------------------------------------------------------------------------------------------------


def test_file_with_a_record_and_origins_passes(tmp_path):
    write(tmp_path / "a.json", document(origin="synthetic", rain_mm=1.5, label="x", flag=True, missing=None))
    assert messages(tmp_path) == []


def test_file_without_provenance_fails(tmp_path):
    write(tmp_path / "a.json", {"origin": "synthetic", "rain_mm": 1.5})
    assert messages(tmp_path) == [
        "no provenance block: add a top-level 'provenance' member or the sidecar 'a.json.provenance.json'"
    ]


def test_top_level_array_needs_a_sidecar(tmp_path):
    path = write(tmp_path / "a.json", [{"origin": "synthetic", "x": 1}])
    assert any("no provenance block" in message for message in messages(tmp_path))
    sidecar(path)
    assert messages(tmp_path) == []


def test_record_for_content_without_a_dataset_passes(tmp_path):
    write(tmp_path / "farm.json", {"provenance": record_without_dataset(), "origin": "synthetic", "area_ha": 6.0})
    assert messages(tmp_path) == []


def test_record_without_dataset_must_explain_itself(tmp_path):
    write(tmp_path / "farm.json", {"provenance": record_without_dataset(notes=" ")})
    assert messages(tmp_path) == ["provenance has dataset null, so notes must say what the content is"]


@pytest.mark.parametrize(
    ("changes", "fragment"),
    [
        ({"version": None}, "needs a non-empty version"),
        ({"provider": ""}, "needs a non-empty provider"),
        ({"url": None}, "needs a non-empty url"),
        ({"accessed": None}, "needs accessed as a UTC date or timestamp"),
        ({"accessed": "14/11/2026"}, "needs accessed as a UTC date or timestamp"),
        ({"accessed": "2026-11-14T18:30:00+01:00"}, "needs accessed as a UTC date or timestamp"),
        ({"version": "UNVERIFIED"}, "provenance version is UNVERIFIED"),
        ({"dataset": "<exact product short name>"}, "provenance dataset is UNVERIFIED or an unfilled placeholder"),
        ({"id": "imerg"}, "provenance id must look like prov-<name>"),
        ({"agent": ""}, "provenance agent is empty"),
        ({"processing": "resampled"}, "provenance processing must be a list of strings"),
        ({"time_range": ["2026-02-15"]}, "provenance time_range must be [start, end] or null"),
    ],
)
def test_incomplete_record_fails(tmp_path, changes, fragment):
    write(tmp_path / "a.json", {"provenance": record(**changes)})
    assert any(fragment in message for message in messages(tmp_path))


@pytest.mark.parametrize("accessed", ["2026-11-14", "2026-11-14T18:30Z", "2026-11-14T18:30:00.5+00:00"])
def test_accepted_access_date_forms(tmp_path, accessed):
    write(tmp_path / "a.json", {"provenance": record(accessed=accessed)})
    assert messages(tmp_path) == []


def test_record_missing_a_key_fails(tmp_path):
    incomplete = record()
    del incomplete["code_commit"]
    write(tmp_path / "a.json", {"provenance": incomplete})
    assert messages(tmp_path) == ["provenance record lacks: code_commit"]


def test_several_records_pass_and_duplicates_fail(tmp_path):
    write(tmp_path / "ok.json", {"provenance": [record(), record(id="prov-fixture-b")]})
    assert messages(tmp_path) == []
    write(tmp_path / "duplicate.json", {"provenance": [record(), record()]})
    assert messages(tmp_path) == ["provenance[1]: duplicate id prov-fixture-a"]


@pytest.mark.parametrize("block", ["see the README", [], 3, None])
def test_block_of_the_wrong_shape_fails(tmp_path, block):
    write(tmp_path / "a.json", {"provenance": block})
    assert messages(tmp_path) == ["provenance must be a record, a non-empty list of records, or a reference {ref, ids}"]


# --------------------------------------------------------------------------------------------------------
# References to a manifest
# --------------------------------------------------------------------------------------------------------


def reference(*ids, ref="../manifest.json"):
    return {"ref": ref, "ids": list(ids)}


def test_reference_to_manifest_records_passes(tmp_path):
    write(tmp_path / "manifest.json", {"provenance": [record(), record(id="prov-fixture-b")]})
    write(
        tmp_path / "replay" / "day.json",
        {"provenance": reference("prov-fixture-a", "prov-fixture-b"), "origin": "synthetic", "w": 0.5},
    )
    assert messages(tmp_path) == []


def test_reference_to_unknown_id_fails(tmp_path):
    write(tmp_path / "manifest.json", {"provenance": [record()]})
    write(tmp_path / "replay" / "day.json", {"provenance": reference("prov-fixture-z")})
    assert messages(tmp_path) == ["provenance id prov-fixture-z is not in '../manifest.json'"]


def test_reference_to_missing_manifest_fails(tmp_path):
    write(tmp_path / "replay" / "day.json", {"provenance": reference("prov-fixture-a")})
    assert messages(tmp_path) == ["provenance.ref '../manifest.json': manifest not found"]


def test_reference_to_an_invalid_record_fails(tmp_path):
    write(tmp_path / "manifest.json", {"provenance": [record(version=None)]})
    write(tmp_path / "replay" / "day.json", {"provenance": reference("prov-fixture-a")})
    found = messages(tmp_path)
    assert "provenance id prov-fixture-a in '../manifest.json' is invalid: dataset-backed provenance needs a non-empty version" in found


def test_manifest_must_embed_its_records(tmp_path):
    write(tmp_path / "other.json", {"provenance": [record()]})
    write(tmp_path / "manifest.json", {"provenance": reference("prov-fixture-a", ref="other.json")})
    write(tmp_path / "replay" / "day.json", {"provenance": reference("prov-fixture-a")})
    assert (
        "provenance.ref '../manifest.json': manifest must embed its provenance records, not refer to another file"
        in messages(tmp_path)
    )


@pytest.mark.parametrize(
    ("block", "expected"),
    [
        ({"ref": "manifest.json", "ids": []}, "provenance.ids must be a non-empty list of record ids"),
        ({"ref": "manifest.json"}, "provenance.ids must be a non-empty list of record ids"),
        ({"ref": "", "ids": ["prov-fixture-a"]}, "provenance.ref must be the relative path of a manifest JSON"),
    ],
)
def test_malformed_reference_fails(tmp_path, block, expected):
    write(tmp_path / "a.json", {"provenance": block})
    assert messages(tmp_path) == [expected]


# --------------------------------------------------------------------------------------------------------
# Origin of every number
# --------------------------------------------------------------------------------------------------------

PASSING_BODIES = {
    "sibling origin": {"area_ha": 6.0, "area_ha_origin": "synthetic"},
    "key in the origin map": {"origin": {"twi_mean": "sourced"}, "twi_mean": 7.0},
    "default of the origin map": {"origin": {"*": "synthetic"}, "a": 1, "b": 2.5},
    "string origin": {"origin": "sourced", "a": 1},
    "inherited through objects and arrays": {"origin": "sourced", "nested": {"deep": [{"x": 1}, [2, 3]]}},
    "value envelope": {"param": {"value": 2, "origin": "estimated"}},
    "sibling origin covers an array": {"twi_range": [1.0, 2.0], "twi_range_origin": "sourced"},
    "map entry covers a nested object": {"origin": {"percentiles": "sourced"}, "percentiles": {"upstream": 0.9}},
    "null needs no origin": {"soil_moisture": None},
    "null may be pending": {"soil_moisture": None, "soil_moisture_origin": "pending"},
    "text and booleans need no origin": {"name": "lot", "active": True},
    "origin array parallel to the values": {
        "soil_moisture": [0.4, None, 0.5],
        "soil_moisture_origin": ["sourced", None, "estimated"],
    },
    "absent optional sibling": {"origin": "sourced", "soil_moisture": [0.4], "soil_moisture_origin": None},
}


@pytest.mark.parametrize("body", PASSING_BODIES.values(), ids=PASSING_BODIES.keys())
def test_numbers_with_an_origin_pass(tmp_path, body):
    write(tmp_path / "a.json", document(**body))
    assert messages(tmp_path) == []


FAILING_BODIES = {
    "no origin anywhere": ({"units": [{"w": 0.5}]}, "$.units[0].w: number without an origin"),
    "origin that is not in the enumeration": ({"origin": "tyson", "a": 1}, "$.origin: origin 'tyson' is not one of"),
    "value whose origin is pending": ({"a": 1, "a_origin": "pending"}, "$.a: has a value, but its origin is 'pending'"),
    "sibling wins over the object origin": (
        {"origin": "sourced", "a": 1, "a_origin": "pending"},
        "$.a: has a value, but its origin is 'pending'",
    ),
    "map without the key and without a default": ({"origin": {"b": "sourced"}, "a": 1}, "$.a: number without an origin"),
    "unknown origin inside a map": ({"origin": {"a": "guess"}, "a": 1}, "$.origin.a: origin 'guess' is not one of"),
    "origin array of another length": ({"s": [1, 2], "s_origin": ["sourced"]}, "$.s_origin: an origin array must match the length of 's'"),
    "origin array with a gap under a number": ({"s": [1, 2], "s_origin": ["sourced", None]}, "$.s[1]: number without an origin"),
    "origin array with an unknown entry": ({"s": [1], "s_origin": ["guess"]}, "$.s_origin: every entry must be null or one of"),
    "reserved key used for something else": ({"origin": [1, 2]}, "$.origin: 'origin' is reserved for the data origin"),
    "reserved suffix used for something else": ({"grid_origin": {"x": 1}}, "$.grid_origin: '<name>_origin' is reserved"),
    "an origin does not reach a sibling object": (
        {"a": {"origin": "sourced", "x": 1}, "b": {"y": 2}},
        "$.b.y: number without an origin",
    ),
}


@pytest.mark.parametrize(("body", "expected"), FAILING_BODIES.values(), ids=FAILING_BODIES.keys())
def test_numbers_without_a_valid_origin_fail(tmp_path, body, expected):
    write(tmp_path / "a.json", document(**body))
    assert any(message.startswith(expected) for message in messages(tmp_path)), messages(tmp_path)


def test_numbers_inside_the_provenance_block_need_no_origin(tmp_path):
    write(tmp_path / "a.json", {"provenance": record(step_count=3), "label": "x"})
    assert messages(tmp_path) == []


def test_origin_problems_are_capped_per_file(tmp_path):
    write(tmp_path / "a.json", document(values=list(range(500))))
    found = messages(tmp_path)
    assert len(found) == cp.MAX_ORIGIN_PROBLEMS_PER_FILE + 1
    assert found[-1].startswith("more origin problems not shown")


def test_geojson_geometry_takes_its_origin_from_properties(tmp_path):
    collection = {
        "type": "FeatureCollection",
        "provenance": record(),
        "features": [
            feature({"origin": "synthetic", "twi_range": [1.0, 2.0]}),
            feature({"geometry_origin": "provided", "name": "pin"}),
            feature({"origin": {"geometry": "sourced"}}),
        ],
    }
    write(tmp_path / "zones.geojson", collection)
    assert messages(tmp_path) == []


def test_geojson_geometry_without_an_origin_fails(tmp_path):
    write(tmp_path / "zones.geojson", {"type": "FeatureCollection", "provenance": record(), "features": [feature({"name": "x"})]})
    assert messages(tmp_path) == [
        "$.features[0].geometry.coordinates[0]: number without an origin",
        "$.features[0].geometry.coordinates[1]: number without an origin",
    ]


def test_geojson_collection_level_origin_reaches_every_feature(tmp_path):
    write(
        tmp_path / "catchment.geojson",
        {"type": "FeatureCollection", "provenance": record(), "origin": "sourced", "features": [feature({})]},
    )
    assert messages(tmp_path) == []


# --------------------------------------------------------------------------------------------------------
# Strict JSON
# --------------------------------------------------------------------------------------------------------


def test_invalid_json_fails(tmp_path):
    write(tmp_path / "a.json", "{not json")
    assert len(messages(tmp_path)) == 1
    assert messages(tmp_path)[0].startswith("cannot be read as JSON")


@pytest.mark.parametrize("literal", ["NaN", "Infinity", "-Infinity"])
def test_non_finite_literal_fails(tmp_path, literal):
    write(tmp_path / "a.json", '{"provenance": %s, "origin": "synthetic", "a": %s}' % (json.dumps(record()), literal))
    assert messages(tmp_path) == [
        f"cannot be read as JSON: non-finite number literal {literal}: write null for a missing value"
    ]


def test_number_that_overflows_fails(tmp_path):
    write(tmp_path / "a.json", '{"provenance": %s, "origin": "synthetic", "a": 1e999}' % json.dumps(record()))
    assert messages(tmp_path) == ["$.a: non-finite number: write null for a missing value"]


def test_utf8_byte_order_mark_is_accepted(tmp_path):
    (tmp_path / "a.json").write_text(json.dumps(document(origin="synthetic", a=1)), encoding="utf-8-sig")
    assert messages(tmp_path) == []


# --------------------------------------------------------------------------------------------------------
# Sidecars and CSV
# --------------------------------------------------------------------------------------------------------


def test_untouched_download_with_a_sidecar_passes(tmp_path):
    path = write(tmp_path / "raw" / "response.json", {"values": [1, 2]})
    sidecar(path, origin="synthetic")
    report = cp.check_paths([tmp_path])
    assert report.ok
    assert (report.data_files, report.sidecars) == (1, 1)


def test_sidecar_origin_map_applies_to_top_level_keys(tmp_path):
    path = write(tmp_path / "response.json", {"a": 1, "b": 2})
    sidecar(path, origin={"a": "synthetic"})
    assert messages(tmp_path) == ["$.b: number without an origin"]


def test_invalid_sidecar_origin_gives_no_origin(tmp_path):
    path = write(tmp_path / "response.json", {"a": 1})
    sidecar(path, origin="guess")
    found = messages(tmp_path)
    assert found[0].startswith("sidecar.origin: origin 'guess' is not one of")
    assert "$.a: number without an origin" in found


def test_sidecar_without_its_data_file_fails(tmp_path):
    write(tmp_path / "gone.json.provenance.json", {"provenance": record()})
    assert messages(tmp_path) == ["sidecar without its data file 'gone.json'"]


def test_sidecar_must_hold_a_provenance_member(tmp_path):
    path = write(tmp_path / "a.json", {"label": "x"})
    write(path.with_name("a.json.provenance.json"), {"origin": "synthetic"})
    assert messages(tmp_path) == ["a sidecar must be an object with a 'provenance' member"]


def test_sidecar_of_a_binary_file_is_validated(tmp_path):
    binary = tmp_path / "stack.nc"
    binary.write_bytes(b"\x00synthetic fixture, not a NetCDF file")
    sidecar(binary, record(url=None))
    report = cp.check_paths([tmp_path])
    assert (report.data_files, report.sidecars) == (1, 1)
    assert [message for _, message in report.violations] == ["dataset-backed provenance needs a non-empty url"]


def test_csv_with_sidecar_and_origin_passes(tmp_path):
    path = write(tmp_path / "series.csv", "date,rain_mm,note\n2026-11-14,1.5,x\n2026-11-15,,y\n")
    sidecar(path, origin="synthetic")
    assert messages(tmp_path) == []


def test_csv_without_sidecar_fails(tmp_path):
    write(tmp_path / "series.csv", "name\nx\n")
    assert messages(tmp_path) == ["no provenance block: a CSV needs the sidecar 'series.csv.provenance.json'"]


def test_csv_number_without_origin_fails(tmp_path):
    path = write(tmp_path / "series.csv", "date,rain_mm\n2026-11-14,1.5\n")
    sidecar(path)
    assert messages(tmp_path) == ["line 2, column 'rain_mm': number without an origin"]


def test_csv_origin_per_value_per_row_and_per_column(tmp_path):
    path = write(
        tmp_path / "series.csv",
        "a,a_origin,b,origin,c\n1,synthetic,2,estimated,3\n4,,5,,6\n",
    )
    sidecar(path, origin={"c": "sourced"})
    assert messages(tmp_path) == [
        "line 3, column 'a': number without an origin",
        "line 3, column 'b': number without an origin",
    ]


def test_csv_sidecar_default_origin(tmp_path):
    path = write(tmp_path / "series.csv", "a,b\n1,2\n")
    sidecar(path, origin={"*": "synthetic"})
    assert messages(tmp_path) == []


@pytest.mark.parametrize("cell", ["NaN", "inf"])
def test_csv_non_finite_cell_fails(tmp_path, cell):
    path = write(tmp_path / "series.csv", f"a\n{cell}\n")
    sidecar(path, origin="synthetic")
    assert messages(tmp_path) == ["line 2, column 'a': non-finite number: write null for a missing value"]


def test_csv_unknown_origin_cell_fails(tmp_path):
    path = write(tmp_path / "series.csv", "a,a_origin\n1,guess\n")
    sidecar(path)
    found = messages(tmp_path)
    assert len(found) == 2
    assert found[0].startswith("line 2, column 'a': origin 'guess' is not one of")
    assert found[1].startswith("line 2, column 'a_origin': origin 'guess' is not one of")


# --------------------------------------------------------------------------------------------------------
# Command line
# --------------------------------------------------------------------------------------------------------


def test_main_returns_zero_on_clean_data(tmp_path, capsys):
    write(tmp_path / "a.json", document(origin="synthetic", a=1))
    assert cp.main([str(tmp_path)]) == 0
    assert "check_provenance: OK - 1 data file(s), 0 sidecar(s)" in capsys.readouterr().out


def test_main_returns_one_and_lists_each_violation(tmp_path, capsys):
    write(tmp_path / "a.json", {"a": 1})
    assert cp.main([str(tmp_path)]) == 1
    output = capsys.readouterr().out
    assert "a.json: no provenance block" in output
    assert "a.json: $.a: number without an origin" in output
    assert "check_provenance: FAILED - 2 violation(s) in 1 file(s)" in output


def test_main_checks_a_single_file(tmp_path):
    good = write(tmp_path / "good.json", document(origin="synthetic", a=1))
    write(tmp_path / "bad.json", {"a": 1})
    assert cp.main([str(good)]) == 0


def test_main_rejects_a_path_that_does_not_exist(tmp_path):
    with pytest.raises(SystemExit) as raised:
        cp.main([str(tmp_path / "absent")])
    assert raised.value.code == 2


def test_default_roots_are_the_two_data_directories():
    assert cp.DEFAULT_ROOTS == ("pipeline/data", "app/public/data")
    assert cp.ORIGINS == ("sourced", "calibrated", "provided", "observed", "estimated", "synthetic", "design", "pending")


def test_repository_data_passes_with_the_standard_library_only(tmp_path):
    """The committed data passes its own gate, run as a plain script without the project's packages."""
    result = subprocess.run(
        [sys.executable, "-I", "-S", str(SCRIPT)],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "check_provenance: OK" in result.stdout


# --------------------------------------------------------------------------------------------------------
# Regressions from the phase 0 code review (2026-11-14)
# --------------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("delimiter", [";", "\t", "|"], ids=["semicolon", "tab", "pipe"])
def test_csv_other_delimiters_are_detected(tmp_path, delimiter):
    """Review HIGH: a semicolon, tab or pipe CSV must not hide numbers inside one wide text cell."""
    path = write(tmp_path / "series.csv", f"date{delimiter}rain_mm\n2026-11-14{delimiter}1.5\n2026-11-15{delimiter}2\n")
    sidecar(path)
    assert messages(tmp_path) == [
        "line 2, column 'rain_mm': number without an origin",
        "line 3, column 'rain_mm': number without an origin",
    ]


def test_csv_row_with_more_cells_than_the_header_fails(tmp_path):
    path = write(tmp_path / "series.csv", "a\nx,1.5\n")
    sidecar(path, origin="synthetic")
    assert messages(tmp_path) == ["line 2: 2 cells, but the header names 1 column(s)"]


def test_csv_without_a_header_row_fails(tmp_path):
    path = write(tmp_path / "series.csv", "1.5,2.5\n3,4\n")
    sidecar(path, origin="synthetic")
    assert messages(tmp_path) == ["line 1: every cell is a number, so the file has no header row naming the columns"]


@pytest.mark.parametrize("cell", ['"45,2"', '"1,234.5"', "45.2mm", "1 234", "12:30", "lot_fixture_1"])
def test_csv_cell_with_a_digit_needs_an_origin(tmp_path, cell):
    """Review HIGH: comma decimals, thousands separators and numbers with units are numbers, not text."""
    path = write(tmp_path / "series.csv", f"a\n{cell}\n")
    sidecar(path)
    assert messages(tmp_path) == ["line 2, column 'a': number without an origin"]


def test_csv_iso_dates_and_plain_text_need_no_origin(tmp_path):
    path = write(tmp_path / "series.csv", "date,at,note\n2026-11-14,2026-11-14T06:00:00Z,fixture\n")
    sidecar(path)
    assert messages(tmp_path) == []


def test_single_file_run_validates_its_sidecar(tmp_path, capsys):
    """Review MEDIUM 1: naming one data file also checks the sidecar next to it."""
    path = write(tmp_path / "a.json", {"label": "x"})
    sidecar(path, record(url=None))
    report = cp.check_paths([path])
    assert (report.data_files, report.sidecars) == (1, 1)
    assert [message for _, message in report.violations] == ["dataset-backed provenance needs a non-empty url"]
    assert cp.main([str(path)]) == 1


def test_file_and_sidecar_named_together_are_checked_once(tmp_path):
    path = write(tmp_path / "a.json", {"label": "x"})
    side = sidecar(path, origin="synthetic")
    report = cp.check_paths([path, side, tmp_path])
    assert report.ok
    assert (report.data_files, report.sidecars) == (1, 1)


def test_reference_outside_the_scanned_folder_fails(tmp_path):
    """Review MEDIUM 3: provenance.ref may not reach a manifest outside the folder being scanned."""
    write(tmp_path / "manifest.json", {"provenance": [record()]})
    write(tmp_path / "data" / "day.json", {"provenance": reference("prov-fixture-a"), "origin": "synthetic", "w": 0.5})
    assert messages(tmp_path / "data") == ["provenance.ref '../manifest.json' points outside the scanned folder"]
    assert messages(tmp_path) == []


@pytest.mark.parametrize("text", ["45.2", "-3", "1e-3", "45,2", "1,234.5", "45.2mm", "07"])
def test_number_written_as_text_needs_an_origin(tmp_path, text):
    """Review MEDIUM 4: a number inside a JSON string is still a number."""
    write(tmp_path / "a.json", document(a=text))
    assert messages(tmp_path) == [f"$.a: number written as text {text!r}: number without an origin"]


def test_number_written_as_text_with_pending_origin_fails(tmp_path):
    write(tmp_path / "a.json", document(a="45.2", a_origin="pending"))
    assert messages(tmp_path) == ["$.a: number written as text '45.2': has a value, but its origin is 'pending' (pending values are null)"]


@pytest.mark.parametrize("text", ["2026-11-14", "2026-11-14T06:00:00Z", "1.0.0", "lot_fixture_1", "prov-fixture-a", "Lote 3"])
def test_text_that_is_not_a_number_needs_no_origin(tmp_path, text):
    write(tmp_path / "a.json", document(a=text))
    assert messages(tmp_path) == []
