#!/usr/bin/env python3
"""Generate the machine-checked contracts from pipeline/common/models.py (ADR-005).

Writes:
- docs/contracts/schemas/**/*.schema.json   JSON Schema, draft 2020-12, one file per contract
- app/src/types/contracts.ts                TypeScript types and enumeration value lists

Usage, from the repository root:
    uv run python scripts/export_contracts.py            write both artefacts
    uv run python scripts/export_contracts.py --check    exit 1 if a committed artefact differs

Owner: lead-architect. Never edit the generated files by hand: change the models, then run this script.
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from pydantic import BaseModel, TypeAdapter  # noqa: E402

from pipeline.common import models  # noqa: E402

SCHEMA_DIR = REPO_ROOT / "docs" / "contracts" / "schemas"
TS_FILE = REPO_ROOT / "app" / "src" / "types" / "contracts.ts"
JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema"
GENERATED_NOTE = "GENERATED from pipeline/common/models.py by scripts/export_contracts.py. Do not edit by hand."
_ROOT_META_KEYS = ("$schema", "$id", "$comment", "x-contract-version", "$defs")
_IDENTIFIER = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")


# --------------------------------------------------------------------------------------------------------
# JSON Schema
# --------------------------------------------------------------------------------------------------------


def _strip_property_titles(node: Any) -> None:
    """Drop the auto-generated title of every property; model and enum titles stay."""
    if isinstance(node, dict):
        properties = node.get("properties")
        if isinstance(properties, dict):
            for prop in properties.values():
                if isinstance(prop, dict):
                    prop.pop("title", None)
        for value in node.values():
            _strip_property_titles(value)
    elif isinstance(node, list):
        for item in node:
            _strip_property_titles(item)


def build_json_schemas() -> dict[str, dict[str, Any]]:
    """Return {relative schema path: JSON Schema} for every registered contract."""
    schemas: dict[str, dict[str, Any]] = {}
    for path, target in models.JSON_SCHEMAS.items():
        if isinstance(target, type) and issubclass(target, BaseModel):
            body = target.model_json_schema(mode="validation")
        else:
            # A named union or alias: publish it as a named definition and point the root at it, so the
            # definition is identical to the one other schemas embed.
            inline = TypeAdapter(target).json_schema(mode="validation")
            definitions = inline.pop("$defs", {})
            definitions[target.__name__] = inline
            body = {"$defs": definitions, "$ref": f"#/$defs/{target.__name__}"}
        _strip_property_titles(body)
        schema: dict[str, Any] = {
            "$schema": JSON_SCHEMA_DIALECT,
            "$id": path,
            "$comment": GENERATED_NOTE,
            "x-contract-version": models.CONTRACT_VERSION,
        }
        schema.update(body)
        schemas[path] = schema
    return schemas


def render_json(schema: dict[str, Any]) -> str:
    return json.dumps(schema, indent=2, ensure_ascii=False) + "\n"


# --------------------------------------------------------------------------------------------------------
# TypeScript
# --------------------------------------------------------------------------------------------------------


def collect_definitions(schemas: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Gather every named type (models, enums, aliases) across all schemas, checking they agree."""
    definitions: dict[str, dict[str, Any]] = {}

    def add(name: str, definition: dict[str, Any], where: str) -> None:
        if not _IDENTIFIER.match(name):
            raise ValueError(f"{where}: '{name}' is not a usable TypeScript identifier")
        if name in definitions and definitions[name] != definition:
            raise ValueError(f"{where}: two different definitions are both named '{name}'")
        definitions[name] = definition

    for path, schema in schemas.items():
        for name, definition in schema.get("$defs", {}).items():
            add(name, definition, path)
        root = {key: value for key, value in schema.items() if key not in _ROOT_META_KEYS}
        if "$ref" in root:
            continue  # the root is only an alias of a named definition
        add(root["title"], root, path)
    return definitions


def _doc(text: str | None, indent: str = "") -> list[str]:
    if not text:
        return []
    safe = " ".join(text.replace("*/", "* /").split())
    return [f"{indent}/** {safe} */"]


def _key(name: str) -> str:
    return name if _IDENTIFIER.match(name) else json.dumps(name)


def _union(parts: list[str]) -> str:
    unique: list[str] = []
    for part in parts:
        if part not in unique:
            unique.append(part)
    if "unknown" in unique:
        return "unknown"
    return " | ".join(unique)


def ts_type(schema: Any) -> str:
    """Map a JSON Schema node (as Pydantic emits it) to a TypeScript type expression."""
    if schema is True or schema == {}:
        return "unknown"
    if not isinstance(schema, dict):
        raise ValueError(f"cannot map schema node to TypeScript: {schema!r}")
    if "$ref" in schema:
        return schema["$ref"].rsplit("/", 1)[-1]
    if "const" in schema:
        return json.dumps(schema["const"])
    if "enum" in schema:
        return _union([json.dumps(value) for value in schema["enum"]])
    for keyword in ("anyOf", "oneOf"):
        if keyword in schema:
            return _union([ts_type(option) for option in schema[keyword]])
    if "allOf" in schema and len(schema["allOf"]) == 1:
        return ts_type(schema["allOf"][0])
    kind = schema.get("type")
    if isinstance(kind, list):
        return _union([ts_type({**schema, "type": one}) for one in kind])
    if kind == "string":
        return "string"
    if kind in ("number", "integer"):
        return "number"
    if kind == "boolean":
        return "boolean"
    if kind == "null":
        return "null"
    if kind == "array":
        if "prefixItems" in schema:
            return "[" + ", ".join(ts_type(item) for item in schema["prefixItems"]) + "]"
        inner = ts_type(schema.get("items", {}))
        return f"({inner})[]" if " | " in inner else f"{inner}[]"
    if kind == "object" or "properties" in schema or "additionalProperties" in schema:
        if "properties" in schema:
            return "{ " + " ".join(_property_lines(schema, indent="")) + " }"
        patterned = schema.get("patternProperties")
        if isinstance(patterned, dict) and patterned:
            return f"Record<string, {_union([ts_type(value) for value in patterned.values()])}>"
        extra = schema.get("additionalProperties")
        if isinstance(extra, dict) and extra:
            return f"Record<string, {ts_type(extra)}>"
        return "Record<string, unknown>"
    return "unknown"


def _property_lines(schema: dict[str, Any], indent: str) -> list[str]:
    required = set(schema.get("required", []))
    lines: list[str] = []
    for name, prop in schema["properties"].items():
        lines.extend(_doc(prop.get("description"), indent))
        optional = "" if name in required else "?"
        lines.append(f"{indent}{_key(name)}{optional}: {ts_type(prop)};")
    if schema.get("additionalProperties") not in (None, False):
        lines.append(f"{indent}[key: string]: unknown;")
    return lines


def _constant_name(type_name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", type_name).upper() + "_VALUES"


def render_typescript(schemas: dict[str, dict[str, Any]]) -> str:
    definitions = collect_definitions(schemas)
    out: list[str] = [
        "/* eslint-disable */",
        "// GENERATED FILE. Do not edit by hand.",
        "// Source of truth: pipeline/common/models.py (docs/contracts/CONTRACTS.md, ADR-005).",
        "// Regenerate:      uv run python scripts/export_contracts.py",
        "// Drift check:     uv run pytest tests/test_contracts.py",
        "",
        f"export const CONTRACT_VERSION = {json.dumps(models.CONTRACT_VERSION)};",
        "",
    ]
    for name in sorted(definitions):
        definition = definitions[name]
        out.extend(_doc(definition.get("description")))
        if "enum" in definition:
            constant = _constant_name(name)
            values = ", ".join(json.dumps(value) for value in definition["enum"])
            out.append(f"export const {constant} = [{values}] as const;")
            out.append(f"export type {name} = (typeof {constant})[number];")
        elif "properties" in definition:
            out.append(f"export interface {name} {{")
            out.extend(_property_lines(definition, indent="  "))
            out.append("}")
        else:
            out.append(f"export type {name} = {ts_type(definition)};")
        out.append("")
    return "\n".join(out)


# --------------------------------------------------------------------------------------------------------
# Write and check
# --------------------------------------------------------------------------------------------------------


def _stale_schema_files(schemas: dict[str, dict[str, Any]]) -> list[Path]:
    if not SCHEMA_DIR.exists():
        return []
    expected = {(SCHEMA_DIR / path).resolve() for path in schemas}
    return sorted(path for path in SCHEMA_DIR.rglob("*.schema.json") if path.resolve() not in expected)


def check() -> list[str]:
    """Return one message per difference between the models and the committed artefacts."""
    problems: list[str] = []
    schemas = build_json_schemas()
    for path, schema in schemas.items():
        target = SCHEMA_DIR / path
        if not target.exists():
            problems.append(f"missing schema file: docs/contracts/schemas/{path}")
            continue
        try:
            committed = json.loads(target.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            problems.append(f"docs/contracts/schemas/{path} is not valid JSON: {error}")
            continue
        if committed != schema:
            problems.append(f"docs/contracts/schemas/{path} differs from pipeline/common/models.py")
    for stale in _stale_schema_files(schemas):
        problems.append(f"schema file with no model behind it: {stale.relative_to(REPO_ROOT).as_posix()}")
    expected_ts = render_typescript(schemas)
    if not TS_FILE.exists():
        problems.append("missing app/src/types/contracts.ts")
    elif TS_FILE.read_text(encoding="utf-8").replace("\r\n", "\n") != expected_ts:
        problems.append("app/src/types/contracts.ts differs from pipeline/common/models.py")
    return problems


def write() -> list[Path]:
    """Write every artefact and return the paths written."""
    written: list[Path] = []
    schemas = build_json_schemas()
    for path, schema in schemas.items():
        target = SCHEMA_DIR / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(render_json(schema), encoding="utf-8", newline="\n")
        written.append(target)
    TS_FILE.parent.mkdir(parents=True, exist_ok=True)
    TS_FILE.write_text(render_typescript(schemas), encoding="utf-8", newline="\n")
    written.append(TS_FILE)
    return written


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate JSON Schemas and TypeScript types from the contract models.")
    parser.add_argument("--check", action="store_true", help="do not write; exit 1 if a committed artefact differs")
    args = parser.parse_args(argv)
    if args.check:
        problems = check()
        for problem in problems:
            print(f"export_contracts: {problem}")
        if problems:
            print("export_contracts: FAILED. Run `uv run python scripts/export_contracts.py` and commit the result.")
            return 1
        print(f"export_contracts: OK, {len(models.JSON_SCHEMAS)} schemas and contracts.ts match the models")
        return 0
    written = write()
    stale = _stale_schema_files(build_json_schemas())
    for path in stale:
        print(f"export_contracts: stale schema file, delete it if the contract was removed: {path.relative_to(REPO_ROOT).as_posix()}")
    print(f"export_contracts: wrote {len(written)} files (contract version {models.CONTRACT_VERSION})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
