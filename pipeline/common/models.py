"""Demenova contracts as Pydantic models: the single source of truth for every cross-agent interface.

This module formalises docs/contracts/CONTRACTS.md (v1). Two artefacts are GENERATED from it by
`uv run python scripts/export_contracts.py`:

- JSON Schema files in docs/contracts/schemas/  (one per entity, app data file, domain file and config file)
- TypeScript types in app/src/types/contracts.ts

`tests/test_contracts.py` fails when either artefact drifts from this module (ADR-005).

Owner: lead-architect. Changing a field here is a contract change (CLAUDE.md §6):
backward-compatible additions are class B, anything that renames, removes or changes the type or meaning of
a field is class A and goes to docs/decisions/PENDING.md first.

Rule zero: this module holds shapes, enumerations and rules only. It contains no data values, no thresholds
and no dataset identifiers. Numeric bounds below are definitional (a fraction lies in 0..1, rain is not
negative, NDVI lies in -1..1 by its formula), never tuned.

Conventions (ADR-002): coordinates EPSG:4326 as [longitude, latitude]; timestamps UTC ISO 8601; dates
YYYY-MM-DD; SI storage units named in the field suffix (_mm, _c, _ha, _cm); percentages stored as 0..1
fractions; a missing value is null and its origin is `pending`.
"""

import datetime as dt
import math
import re
from collections.abc import Mapping
from dataclasses import dataclass
from enum import IntEnum, StrEnum
from typing import Annotated, Any, Literal, Union

from pydantic import (
    AfterValidator,
    AwareDatetime,
    BeforeValidator,
    BaseModel,
    ConfigDict,
    Field,
    Strict,
    StringConstraints,
    create_model,
    model_validator,
)
from typing_extensions import TypeAliasType

CONTRACT_VERSION = "1.1.0"  # 1.1.0 (D-020): telegram_code on Farm and TelegramSubscriber

# CONTRACTS.md §4 gives sizes in KB and MB; they are read here as 1 KB = 1024 bytes.
KB = 1024
MB = 1024 * KB


# --------------------------------------------------------------------------------------------------------
# Enumerations (CONTRACTS.md §2 and §3)
# --------------------------------------------------------------------------------------------------------


class Origin(StrEnum):
    """Where a value comes from (docs/DATA_POLICY.md §1). Every stored or displayed value carries exactly one."""

    sourced = "sourced"
    calibrated = "calibrated"
    provided = "provided"
    observed = "observed"
    estimated = "estimated"
    synthetic = "synthetic"
    design = "design"
    pending = "pending"


class Severity(StrEnum):
    """The five alert states of a unit (CONTRACTS.md §2). `stale` means the newest rain data is too old."""

    normal = "normal"
    watch = "watch"
    warning = "warning"
    severe = "severe"
    stale = "stale"


class AlertLevel(StrEnum):
    """The four severity levels that carry a recommended action (Severity without `stale`)."""

    normal = "normal"
    watch = "watch"
    warning = "warning"
    severe = "severe"


class DataLevel(IntEnum):
    """How much the farm has told Demenova: 0 pin, 1 outline + zones, 2 lots, 3 field notes."""

    pin = 0
    outline = 1
    lots = 2
    field_notes = 3


class Language(StrEnum):
    """Interface language."""

    en = "en"
    es = "es"


class UnitSystem(StrEnum):
    """Display units. Storage is always SI; imperial is a display-only conversion."""

    metric = "metric"
    imperial = "imperial"


class Mode(StrEnum):
    """Farmer mode (one status, one alert, one action) or agronomist mode (full detail)."""

    farmer = "farmer"
    agronomist = "agronomist"


class StorageMode(StrEnum):
    """Offline storage mode (ADR-004): full = status + 90 days + imagery cache; saver = status + 7 days."""

    full = "full"
    saver = "saver"


class Theme(StrEnum):
    """Colour theme preference."""

    system = "system"
    light = "light"
    dark = "dark"


class Tercile(StrEnum):
    """Terrain-wetness third of a farm (TWI ranked within the farm)."""

    low = "low"
    mid = "mid"
    high = "high"


class DrainageClass(StrEnum):
    """Drainage class of a lot."""

    good = "good"
    moderate = "moderate"
    poor = "poor"


class DrainageWorks(StrEnum):
    """Drainage works present on a lot."""

    none = "none"
    ditches = "ditches"
    other = "other"


class CoverCrop(StrEnum):
    """Living cover on a lot. `mani_forrajero` is Arachis pintoi."""

    none = "none"
    mani_forrajero = "mani_forrajero"
    other = "other"


class Incidence(StrEnum):
    """Qualitative incidence level."""

    low = "low"
    medium = "medium"
    high = "high"


class SoilMoistureSource(StrEnum):
    """Where a day's soil-moisture value came from: SMAP, or the antecedent precipitation index gap-fill."""

    smap = "smap"
    api = "api"


class FactorName(StrEnum):
    """The five indicators of the alert index W (docs/SPEC.md, Risk engine and weighted alerts)."""

    upstream = "upstream"
    saturation = "saturation"
    terrain = "terrain"
    local = "local"
    balance = "balance"


class FieldNoteKind(StrEnum):
    """Kind of a data-level-3 field note."""

    soil_analysis = "soil_analysis"
    water_table = "water_table"
    management = "management"
    other = "other"


class EmailStatus(StrEnum):
    """Delivery status of an alert email."""

    queued = "queued"
    sent = "sent"
    failed = "failed"


class StrategyLabel(StrEnum):
    """A = current management, B and C = the two alternatives."""

    A = "A"
    B = "B"
    C = "C"


class AlertParamOrigin(StrEnum):
    """Origins allowed for a parameter in config/alerts.yaml (no user-provided or synthetic parameters)."""

    sourced = "sourced"
    calibrated = "calibrated"
    estimated = "estimated"
    design = "design"
    pending = "pending"


class ZoneOrigin(StrEnum):
    """Origins allowed for an automatic terrain zone (CONTRACTS.md §3)."""

    calibrated = "calibrated"
    sourced = "sourced"


class DatasetOrigin(StrEnum):
    """A dataset entry is either verified against its official page (sourced) or not yet (pending)."""

    sourced = "sourced"
    pending = "pending"


class VerificationOutcome(StrEnum):
    """Forecast-verification outcome of one event (docs/SPEC.md, Prediction science, method 14)."""

    hit = "hit"
    miss = "miss"
    false_alarm = "false_alarm"


class VerificationEventKind(StrEnum):
    """What an entry in the verification table is."""

    documented_flood = "documented_flood"
    flood_memory = "flood_memory"
    alert_without_flood = "alert_without_flood"


# --------------------------------------------------------------------------------------------------------
# Scalar types
# --------------------------------------------------------------------------------------------------------

_SLUG = r"[a-z0-9]+(?:-[a-z0-9]+)*"

FarmId = Annotated[
    str,
    StringConstraints(pattern=rf"^farm_{_SLUG}$"),
    Field(description="farm_<slug>; the slug is lowercase letters, digits and single hyphens."),
]
LotId = Annotated[
    str,
    StringConstraints(pattern=rf"^lot_{_SLUG}_[0-9]+$"),
    Field(description="lot_<farm slug>_<n>."),
]
ZoneId = Annotated[
    str,
    StringConstraints(pattern=rf"^zone_{_SLUG}_(?:low|mid|high)$"),
    Field(description="zone_<farm slug>_<low|mid|high>."),
]
UnitId = Annotated[
    str,
    StringConstraints(pattern=rf"^(?:lot_{_SLUG}_[0-9]+|zone_{_SLUG}_(?:low|mid|high)|farm_{_SLUG})$"),
    Field(
        description=(
            "The unit an alert or feature refers to: a lot id, a zone id, or the farm id itself when the "
            "farm is at data level 0 and has neither lots nor zones."
        )
    ),
]
Ulid = Annotated[
    str,
    StringConstraints(pattern=r"^[0-9A-HJKMNP-TV-Z]{26}$"),
    Field(description="ULID (26 characters, Crockford base32)."),
]
ProvenanceId = Annotated[
    str,
    StringConstraints(pattern=r"^prov-[A-Za-z0-9][A-Za-z0-9._-]*$"),
    Field(description="Identifier of a provenance record, for example prov-<dataset>-<period>."),
]
TaskId = Annotated[
    str,
    StringConstraints(pattern=r"^T-[0-9]{3}$"),
    Field(description="A task id from TASKS.md."),
]
TelegramCode = Annotated[
    str,
    StringConstraints(pattern=r"^[A-Za-z0-9_-]{16,64}$"),
    Field(
        description=(
            "Random, unguessable code of a farm for the Telegram link /start <code> (D-017, PENDING.md P-002 b). "
            "Generated by the database (default: 32 lowercase hexadecimal characters); the pattern mirrors the "
            "farms.telegram_code check in supabase/migrations/20261114000200_core_tables.sql."
        )
    ),
]
EmailAddress = Annotated[str, StringConstraints(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
ConfigKey = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_]*$")]
# Numbers are strict (review 2026-11-14): text such as "45.2" and booleans are rejected instead of being coerced;
# an integer is still a valid float. Enumerations and dates stay lax, so JSON and YAML text keeps working.
Number = Annotated[float, Strict()]
Count = Annotated[int, Strict()]
Fraction = Annotated[float, Strict(), Field(ge=0, le=1)]

# Text that holds a number ("45.2", "45,2", "1,234.5", "1e-3", "45.2mm"); same rule as scripts/check_provenance.py.
_NUMBER_TEXT = re.compile(r"^\s*[+-]?(?:\d+(?:[ ,.'_]\d{3})*(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+)?(?:\s*[^\d\s]{1,6})?\s*$")
_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$")


def is_number_text(value: Any) -> bool:
    """True for a string that holds a number; ISO dates are not numbers."""
    return isinstance(value, str) and bool(_NUMBER_TEXT.match(value)) and not _ISO_DATE.match(value.strip())


def _no_text_or_bool(value: Any) -> Any:
    """For integer enumerations: lax mode would turn "1" or True into a level; only the number itself is valid."""
    if isinstance(value, (str, bool)):
        raise ValueError(f"expected the integer level, not {type(value).__name__}")
    return value


DataLevelValue = Annotated[DataLevel, BeforeValidator(_no_text_or_bool)]


def _require_utc(value: dt.datetime) -> dt.datetime:
    if value.utcoffset() != dt.timedelta(0):
        raise ValueError("timestamps are stored in UTC: use a 'Z' or '+00:00' offset")
    return value


UtcDatetime = Annotated[
    AwareDatetime,
    AfterValidator(_require_utc),
    Field(description="UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset."),
]


def _check_position(value: list[float]) -> list[float]:
    longitude, latitude = value[0], value[1]
    if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
        raise ValueError("a position is [longitude, latitude] in EPSG:4326 degrees")
    return value


Position = TypeAliasType(
    "Position",
    Annotated[
        list[Number],
        Field(min_length=2, max_length=3, description="[longitude, latitude] in EPSG:4326 (optional altitude in m)."),
        AfterValidator(_check_position),
    ],
)


def _check_ring(value: list[list[float]]) -> list[list[float]]:
    if value[0][:2] != value[-1][:2]:
        raise ValueError("a polygon ring is closed: its first and last positions are equal")
    return value


LinearRing = TypeAliasType(
    "LinearRing",
    Annotated[
        list[Position],
        Field(min_length=4, description="Closed ring of positions (GeoJSON, RFC 7946)."),
        AfterValidator(_check_ring),
    ],
)

OriginSpec = TypeAliasType(
    "OriginSpec",
    Annotated[
        Union[Origin, dict[str, Origin]],
        Field(
            description=(
                "Origin of the values in the same object: either one origin for all of them, or a map from "
                "field name to origin where the key '*' is the default for fields not listed. A sibling "
                "'<field>_origin' always wins over this."
            )
        ),
    ],
)


# --------------------------------------------------------------------------------------------------------
# Base class and shared rules
# --------------------------------------------------------------------------------------------------------


class Contract(BaseModel):
    """Base class of every contract model: unknown keys are rejected and non-finite numbers are invalid."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    @model_validator(mode="after")
    def _missing_values_are_pending(self) -> "Contract":
        """A null value has origin `pending` and a `pending` origin has a null value (DATA_POLICY.md §1)."""
        fields = type(self).model_fields
        for name in fields:
            if not name.endswith("_origin"):
                continue
            target = name.removesuffix("_origin")
            if target not in fields:
                continue
            value = getattr(self, target)
            origin = getattr(self, name)
            if origin is None or isinstance(origin, list):
                continue
            if value is None and origin != Origin.pending:
                raise ValueError(f"{target} is null, so {name} must be 'pending'")
            if value is not None and origin == Origin.pending:
                raise ValueError(f"{name} is 'pending', so {target} must be null")
        _reject_pending_numbers(self)
        return self


def _governs_its_own_origins(model: BaseModel) -> bool:
    return any(name == "origin" or name.endswith("_origin") for name in type(model).model_fields)


def _holds_number(value: Any) -> bool:
    """True when a value is, or contains, a number (booleans are not numbers)."""
    if isinstance(value, bool) or value is None:
        return False
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, (list, tuple)):
        return any(_holds_number(item) for item in value)
    if isinstance(value, Mapping):
        return any(_holds_number(item) for item in value.values())
    if isinstance(value, BaseModel) and not _governs_its_own_origins(value):
        return any(_holds_number(getattr(value, name)) for name in type(value).model_fields)
    return False


def _reject_pending_numbers(model: BaseModel) -> None:
    """A number whose resolved origin is `pending` is invalid, whichever form gives the origin (review MEDIUM 6).

    Resolution order as in CONTRACTS.md §8.1: sibling `<field>_origin`, then `origin[field]`, `origin["*"]`,
    then a string `origin`. Like the provenance checker, only numbers are tested: identifiers and text in an
    object whose origin is pending stay valid.
    """
    fields = type(model).model_fields
    spec = getattr(model, "origin", None) if "origin" in fields else None
    for name in fields:
        if name == "origin" or name.endswith("_origin"):
            continue
        value = getattr(model, name)
        sibling = getattr(model, f"{name}_origin", None) if f"{name}_origin" in fields else None
        if isinstance(sibling, list):
            if isinstance(value, list):
                for index, (item, item_origin) in enumerate(zip(value, sibling)):
                    if item_origin == Origin.pending and _holds_number(item):
                        raise ValueError(f"{name}[{index}] has a value, but its origin is 'pending' (pending values are null)")
            continue
        if sibling is not None:
            resolved = sibling
        elif isinstance(spec, Mapping):
            resolved = spec.get(name, spec.get("*"))
        else:
            resolved = spec
        if resolved == Origin.pending and _holds_number(value):
            raise ValueError(f"{name} has a value, but its origin is 'pending' (pending values are null)")


def default_origin(spec: Any) -> str | None:
    """The origin an OriginSpec gives to a field it does not list explicitly."""
    if isinstance(spec, Mapping):
        value = spec.get("*")
        return str(value) if value is not None else None
    return str(spec) if spec is not None else None


def origin_of(record: Mapping[str, Any], field: str) -> str | None:
    """Reference implementation of origin resolution for one field of one JSON object.

    Order: sibling `<field>_origin`, then `origin[<field>]`, then `origin["*"]`, then a string `origin`.
    Returns None when the object says nothing; the caller then falls back to the enclosing object
    (scripts/check_provenance.py does exactly that).
    """
    sibling = record.get(f"{field}_origin")
    if isinstance(sibling, str):
        return sibling
    spec = record.get("origin")
    if isinstance(spec, Mapping):
        value = spec.get(field, spec.get("*"))
        return str(value) if value is not None else None
    if isinstance(spec, str):
        return spec
    return None


def _has_text(value: str | None) -> bool:
    return value is not None and value.strip() != ""


def _is_unverified(value: Any) -> bool:
    """True for text that must never ship: an UNVERIFIED marker or an unfilled <template> placeholder."""
    if not isinstance(value, str):
        return False
    text = value.strip()
    return "UNVERIFIED" in text.upper() or (text.startswith("<") and text.endswith(">"))


# --------------------------------------------------------------------------------------------------------
# Geometry (GeoJSON, RFC 7946, EPSG:4326)
# --------------------------------------------------------------------------------------------------------


class Point(Contract):
    """GeoJSON Point."""

    type: Literal["Point"]
    coordinates: Position


class Polygon(Contract):
    """GeoJSON Polygon."""

    type: Literal["Polygon"]
    coordinates: list[LinearRing] = Field(min_length=1)


class MultiPolygon(Contract):
    """GeoJSON MultiPolygon."""

    type: Literal["MultiPolygon"]
    coordinates: list[Annotated[list[LinearRing], Field(min_length=1)]] = Field(min_length=1)


# --------------------------------------------------------------------------------------------------------
# Provenance (docs/DATA_POLICY.md §3)
# --------------------------------------------------------------------------------------------------------


class Provenance(Contract):
    """Provenance record attached to every data file (docs/DATA_POLICY.md §3).

    All fourteen keys are always present. A record either cites a dataset completely (dataset, version,
    provider, url and accessed all filled) or has `dataset: null` and says in `notes` what the content is
    instead (synthetic demo content, user input, a domain table). No field may hold UNVERIFIED or an
    unfilled <placeholder>.
    """

    id: ProvenanceId
    dataset: str | None = Field(description="Exact product short name, or null when the file is not dataset-backed.")
    version: str | None = Field(description="Exact product version.")
    provider: str | None = Field(description="Data provider, as named on the page that was opened.")
    url: str | None = Field(description="Landing page or DOI that was actually opened.")
    accessed: UtcDatetime | dt.date | None = Field(description="When the source was opened (UTC).")
    spatial_resolution: str | None = Field(description="As published by the provider.")
    temporal_resolution: str | None = Field(description="As published by the provider.")
    aoi: str | None = Field(description="Area-of-interest id the file was cut to.")
    time_range: tuple[dt.date | UtcDatetime, dt.date | UtcDatetime] | None = Field(
        description="[start, end] covered by the file; null for static data."
    )
    processing: list[str] = Field(description="Ordered processing steps, including the resampling method.")
    code_commit: str | None = Field(description="Git commit of the code that produced the file.")
    agent: str = Field(min_length=1, description="Agent or person who produced the file.")
    notes: str

    @model_validator(mode="after")
    def _complete_or_explained(self) -> "Provenance":
        for name in ("dataset", "version", "provider", "url", "spatial_resolution", "temporal_resolution", "aoi", "agent"):
            if _is_unverified(getattr(self, name)):
                raise ValueError(f"{name} is UNVERIFIED or an unfilled placeholder: the file cannot ship")
        if self.dataset is None:
            if not _has_text(self.notes):
                raise ValueError("dataset is null, so notes must say what the content is and where it comes from")
            return self
        for name in ("dataset", "version", "provider", "url"):
            if not _has_text(getattr(self, name)):
                raise ValueError(f"a dataset-backed record needs a non-empty {name}")
        if self.accessed is None:
            raise ValueError("a dataset-backed record needs the access date of the source")
        return self


class ProvenanceRef(Contract):
    """Reference to provenance records kept in a manifest file, so small snapshot files stay small."""

    ref: str = Field(min_length=1, description="Path of the manifest JSON, relative to the referring file.")
    ids: list[ProvenanceId] = Field(min_length=1, description="Ids of records embedded in that manifest.")


ProvenanceBlock = TypeAliasType(
    "ProvenanceBlock",
    Annotated[
        Union[Provenance, Annotated[list[Provenance], Field(min_length=1)], ProvenanceRef],
        Field(description="The `provenance` member of a data file: one record, several records, or a manifest reference."),
    ],
)


class SourceRef(Contract):
    """A source somebody actually opened (docs/DATA_POLICY.md §2.4). Never list one that nobody opened."""

    citation: str = Field(min_length=1, description="Readable citation, for example 'Tyson, 14 Nov 2026' or an article title.")
    url: str | None = Field(description="URL that was opened, or null for a personal communication.")
    accessed: dt.date | None = Field(description="Date the URL was opened.")

    @model_validator(mode="after")
    def _url_has_access_date(self) -> "SourceRef":
        if _is_unverified(self.citation) or _is_unverified(self.url):
            raise ValueError("an UNVERIFIED source cannot be cited")
        if self.url is not None and self.accessed is None:
            raise ValueError("a cited URL needs the date it was opened")
        return self


# --------------------------------------------------------------------------------------------------------
# Entities (CONTRACTS.md §3)
# --------------------------------------------------------------------------------------------------------


class Farm(Contract):
    """A farm. Same fields in Supabase `farms`, in domain/farm.json and in the demo snapshot.

    v1 additions to the draft: `origin` (CONTRACTS.md §2 asks for origin metadata on every numeric field;
    it covers location, outline and data_level) and nullable country, province and canton (a farm that is
    only a pin has no way to know them).
    """

    id: FarmId
    name: str = Field(min_length=1)
    owner_id: str | None = Field(
        description="Supabase auth user id from anonymous sign-in (ADR-003). null for the demo farm and for local-only farms."
    )
    country: str | None
    province: str | None
    canton: str | None
    location: Point = Field(description="The farm pin (data level 0).")
    outline: Polygon | None = Field(description="Farm outline (data level 1 and above), else null.")
    data_level: DataLevelValue
    crop: str
    variety: str | None
    variety_origin: Origin
    catchment_id: str | None = Field(description="Id of the upstream catchment that drains to the farm.")
    alert_email: EmailAddress | None = Field(
        description=(
            "Recipient of Severe emails. Personal data: always null on the demo farm, whose recipient is the "
            "backend environment variable ALERT_EMAIL_TO."
        )
    )
    telegram_code: TelegramCode | None = Field(
        default=None,
        description=(
            "Contract 1.1.0 (D-020). Server-generated, never client-writable: clients omit the key when they write "
            "a farm (sending it, even as null, is rejected by the column grants). Present on farm rows read from "
            "Supabase by the owner, or by anyone for the demo farm; absent or null on local-only farms and in "
            "payloads that did not select it."
        ),
    )
    language: Language
    units: UnitSystem
    mode: Mode
    storage_mode: StorageMode
    is_demo: bool = Field(description="True only for the synthetic demo farm, which the UI labels 'Demo'.")
    created_at: UtcDatetime
    updated_at: UtcDatetime
    origin: OriginSpec

    @model_validator(mode="after")
    def _demo_farm_is_public(self) -> "Farm":
        if self.is_demo and self.owner_id is not None:
            raise ValueError("the demo farm belongs to no user: owner_id must be null")
        if self.is_demo and self.alert_email is not None:
            raise ValueError("the demo farm is public: alert_email must be null (use ALERT_EMAIL_TO in the backend)")
        return self


class SoilAnalysis(Contract):
    """Last soil analysis of a lot."""

    date: dt.date | None
    ph: Number | None = Field(ge=0, le=14)
    organic_matter_pct: Fraction | None = Field(
        description="Organic matter stored as a 0..1 fraction (CONTRACTS.md §2), so 3 % is 0.03. Displayed as a percentage."
    )


class Bioinputs(Contract):
    """Dates of the last bio-input applications on a lot."""

    mycorrhizae_last: dt.date | None = Field(description="Date of the last mycorrhizae application.")
    mm_last: dt.date | None = Field(description="Date of the last mountain-microorganism (MM) drench.")


class Lot(Contract):
    """A lot (data level 2). Same fields in Supabase `lots`, in domain/farm.json and in the demo snapshot.

    Every attribute the draft marks '(+origin)' has a required sibling `<field>_origin`. `origin` is the
    origin of everything else in the record (geometry, name, TWI values); use the map form when they
    differ, for example {"*": "synthetic", "twi_mean": "sourced"} for a demo lot drawn by an agent whose
    TWI comes from SRTM.
    """

    id: LotId
    farm_id: FarmId
    name: str = Field(min_length=1)
    geometry: Polygon
    area_ha: Number | None = Field(gt=0)
    area_ha_origin: Origin
    plant_age_months: Number | None = Field(ge=0)
    plant_age_months_origin: Origin
    variety: str | None
    variety_origin: Origin
    drainage_class: DrainageClass | None
    drainage_class_origin: Origin
    drainage_works: DrainageWorks | None
    drainage_works_origin: Origin
    cover_crop: CoverCrop | None
    cover_crop_origin: Origin
    last_soil_analysis: SoilAnalysis | None
    last_soil_analysis_origin: Origin
    nematode_incidence: Incidence | None
    nematode_incidence_origin: Origin
    disease_notes: str | None
    bioinputs: Bioinputs | None
    bioinputs_origin: Origin
    twi_mean: Number | None = Field(description="Mean topographic wetness index of the lot (engine output).")
    twi_max: Number | None = Field(description="Maximum topographic wetness index of the lot (engine output).")
    twi_tercile: Tercile | None = Field(description="Terrain-wetness third of the lot within its farm.")
    defined_by: str = Field(min_length=1, description="Agent or person who defined the lot.")
    to_be_redefined_by: str | None = Field(description="Who must redefine the lot; required while it is synthetic.")
    origin: OriginSpec

    @model_validator(mode="after")
    def _synthetic_lots_name_their_redefiner(self) -> "Lot":
        if default_origin(self.origin) == Origin.synthetic and not _has_text(self.to_be_redefined_by):
            raise ValueError("a synthetic lot must say who redefines it (to_be_redefined_by)")
        return self


class ZoneProperties(Contract):
    """Attributes of an automatic terrain zone (data level 1): the `properties` of a zone feature."""

    id: ZoneId
    farm_id: FarmId
    tercile: Tercile
    twi_range: tuple[Number, Number] = Field(description="[min, max] topographic wetness index inside the zone.")
    origin: ZoneOrigin

    @model_validator(mode="after")
    def _id_matches_tercile(self) -> "ZoneProperties":
        if not self.id.endswith(f"_{self.tercile.value}"):
            raise ValueError("zone id must end with its tercile")
        if self.twi_range[0] > self.twi_range[1]:
            raise ValueError("twi_range is [min, max]")
        return self


class Zone(ZoneProperties):
    """A terrain zone as a flat record (Supabase `zones`)."""

    geometry: Polygon | MultiPolygon


class Percentiles(Contract):
    """Indicator percentiles against the unit's own history, as 0..1 fractions."""

    upstream: Fraction | None
    saturation: Fraction | None
    local: Fraction | None
    balance: Fraction | None


class DailyFeature(Contract):
    """Engine features of one unit on one day (Supabase `daily_features`).

    v1 additions to the draft: `ndvi_date` (the draft says 'ndvi (+date of image)') and `origin`. The origin
    usually differs per field: rain read from a dataset is `sourced`, soil moisture filled with the
    antecedent precipitation index is `estimated`. Use the map form of `origin` for that.
    """

    unit_id: UnitId
    date: dt.date
    rain_local_mm: Number | None = Field(ge=0)
    rain_upstream_24h_mm: Number | None = Field(ge=0)
    rain_upstream_48h_mm: Number | None = Field(ge=0)
    rain_upstream_72h_mm: Number | None = Field(ge=0)
    runoff_upstream_mm: Number | None = Field(ge=0)
    soil_moisture: Fraction | None = Field(description="Soil moisture as a 0..1 fraction, as published by its source.")
    soil_moisture_source: SoilMoistureSource | None
    api_index: Number | None = Field(ge=0, description="Antecedent precipitation index.")
    et0_mm: Number | None = Field(description="Reference evapotranspiration.")
    etc_mm: Number | None = Field(description="Crop evapotranspiration.")
    balance_mm: Number | None = Field(description="Daily water balance.")
    balance_7d_mm: Number | None = Field(description="7-day running water balance.")
    positive_balance_days: Count | None = Field(ge=0, description="Consecutive days with a positive balance.")
    percentiles: Percentiles
    twi_rank: Fraction | None = Field(description="Terrain-wetness rank within the farm, 0..1.")
    temp_mean_c: Number | None
    rh_mean: Fraction | None = Field(description="Mean relative humidity as a 0..1 fraction.")
    leaf_wet_hours: Number | None = Field(ge=0, le=24)
    heat_units: Number | None
    ndvi: Number | None = Field(ge=-1, le=1)
    ndvi_date: dt.date | None = Field(description="Date of the image the NDVI value comes from.")
    provenance_ids: list[ProvenanceId]
    origin: OriginSpec

    @model_validator(mode="after")
    def _soil_moisture_has_a_source(self) -> "DailyFeature":
        if self.soil_moisture is None and self.soil_moisture_source is not None:
            raise ValueError("soil_moisture is null, so soil_moisture_source must be null")
        if self.soil_moisture is not None and self.soil_moisture_source is None:
            raise ValueError("soil_moisture has a value, so soil_moisture_source must say smap or api")
        if self.ndvi is None and self.ndvi_date is not None:
            raise ValueError("ndvi is null, so ndvi_date must be null")
        return self


class Factor(Contract):
    """One contributing factor of the alert index with its share of W."""

    name: FactorName
    share: Fraction


class SideIndicators(Contract):
    """Side indicators shown on Lot detail, never in the email."""

    sigatoka: Severity | None
    cold: Severity | None


class AlertState(Contract):
    """Current alert state of a unit (Supabase `alert_states`). v1 addition to the draft: `origin`."""

    unit_id: UnitId
    level: Severity
    w: Fraction | None = Field(description="Alert index W, 0..1; null when it cannot be computed.")
    factors: list[Factor]
    since: UtcDatetime = Field(description="When the current level began.")
    updated_at: UtcDatetime
    newest_rain_data_at: UtcDatetime | None
    confirmations: Count = Field(ge=0, le=2, description="Consecutive updates that agree on an escalation to Severe.")
    confidence: Count = Field(ge=0, le=3, description="Confidence badge, tied to the farm's data level.")
    side: SideIndicators
    origin: OriginSpec


class AlertEvent(Contract):
    """A level transition of a unit (Supabase `alert_events`). v1 addition to the draft: `origin`."""

    id: Ulid
    unit_id: UnitId
    from_level: Severity
    to_level: Severity
    w: Fraction | None
    factors: list[Factor]
    at: UtcDatetime
    email_sent: bool
    telegram_sent: bool
    origin: OriginSpec


class FloodMemory(Contract):
    """A past flood remembered by the farmer (Supabase `flood_memories`, domain/flood_memories.yaml)."""

    id: str = Field(min_length=1, description="ULID when created by the app.")
    farm_id: FarmId
    date_or_month: str = Field(pattern=r"^[0-9]{4}-[0-9]{2}(?:-[0-9]{2})?$", description="YYYY-MM-DD or YYYY-MM.")
    lots_or_zone: list[str] = Field(description="Ids of the lots or of the zone the water reached; empty when unknown.")
    days_with_water: Number | None = Field(ge=0)
    damage_notes: str | None
    reported_by: str = Field(min_length=1)
    origin: Literal["observed"]
    matched_event_id: Ulid | None = Field(description="Engine alert event matched to this memory, else null.")
    created_at: UtcDatetime


class FieldNote(Contract):
    """A data-level-3 field note (Supabase `field_notes`). `origin` covers every value in `value_json`."""

    id: str = Field(min_length=1, description="ULID when created by the app.")
    lot_id: LotId
    kind: FieldNoteKind
    date: dt.date
    value_json: dict[str, Any]
    origin: Origin
    created_at: UtcDatetime


class EmailLog(Contract):
    """One alert email, used to send once per unit and Severe episode (Supabase `email_log`)."""

    id: Ulid
    unit_id: UnitId
    episode_start: UtcDatetime
    to_hash: str = Field(min_length=1, description="Hash of the recipient address; the address itself is never stored here.")
    provider_id: str | None
    status: EmailStatus
    created_at: UtcDatetime


class TelegramSubscriber(Contract):
    """A Telegram chat subscribed to a farm (Supabase `telegram_subscribers`)."""

    chat_id: str = Field(min_length=1, description="Telegram chat id, encrypted or hashed where possible.")
    farm_id: FarmId
    telegram_code: TelegramCode = Field(
        description=(
            "Contract 1.1.0 (D-020). The farm's code the chat subscribed with; must equal the farm's current "
            "telegram_code (composite foreign key, no ON UPDATE), so the backend deletes or re-confirms a farm's "
            "subscriptions before rotating its code. Backend only."
        )
    )
    started_at: UtcDatetime
    active: bool


class UserPrefs(Contract):
    """Preferences of one device (Supabase `user_prefs` and local storage).

    The draft says 'user_id/device_id'; v1 keeps both: `device_id` always exists, `user_id` is null while
    the app runs local-only because anonymous sign-in was unavailable (ADR-003).
    """

    user_id: str | None = Field(description="Supabase auth user id, or null in local-only mode.")
    device_id: str = Field(min_length=1, description="Random id generated on the device at first launch.")
    language: Language
    units: UnitSystem
    mode: Mode
    storage_mode: StorageMode
    theme: Theme


# --------------------------------------------------------------------------------------------------------
# Domain tables (domain/, owned by the agronomist; Tyson approves)
# --------------------------------------------------------------------------------------------------------


class DomainMeta(Contract):
    """Origin metadata of one domain value, with the fields docs/DATA_POLICY.md §1 requires per origin.

    Tyson's confirmed answers are `origin: sourced` with `source: "Tyson, <date>"` (DATA_POLICY.md §5);
    there is no origin called 'tyson'.
    """

    origin: Origin
    source: str | None = Field(default=None, description="URL that was opened, 'Tyson, <date>', or a calibration note id.")
    accessed: dt.date | None = Field(default=None, description="Date the source URL was opened.")
    reason: str | None = Field(default=None, description="Why the value is estimated, a design choice, or still pending.")
    estimated_by: str | None = None
    task_id: TaskId | None = Field(default=None, description="TASKS.md item that replaces an estimated value.")
    to_be_redefined_by: str | None = None
    approved_by: str | None = Field(default=None, description="'Tyson' once he approved it, else null.")

    def _payload_missing(self) -> bool | None:
        """True or False when the entry carries a payload that can be missing; None when it does not."""
        return None

    @model_validator(mode="after")
    def _origin_has_its_metadata(self) -> "DomainMeta":
        origin = self.origin
        if _is_unverified(self.source):
            raise ValueError("an UNVERIFIED source cannot back a value")
        if origin in (Origin.sourced, Origin.calibrated, Origin.provided, Origin.observed) and not _has_text(self.source):
            raise ValueError(f"origin '{origin.value}' needs a source")
        if origin == Origin.sourced and self.source is not None and self.source.startswith("http") and self.accessed is None:
            raise ValueError("a sourced URL needs the date it was opened (accessed)")
        if origin == Origin.estimated and not (
            _has_text(self.estimated_by) and _has_text(self.reason) and self.task_id is not None
        ):
            raise ValueError("origin 'estimated' needs estimated_by, reason and task_id")
        if origin == Origin.synthetic and not _has_text(self.to_be_redefined_by):
            raise ValueError("origin 'synthetic' needs to_be_redefined_by")
        if origin in (Origin.design, Origin.pending) and not _has_text(self.reason):
            raise ValueError(f"origin '{origin.value}' needs a reason")
        missing = self._payload_missing()
        if missing is True and origin != Origin.pending:
            raise ValueError("a null value has origin 'pending'")
        if missing is False and origin == Origin.pending:
            raise ValueError("origin 'pending' means the value is null")
        return self


class DomainValue(DomainMeta):
    """One value of a domain table with its origin metadata."""

    value: Any | None = Field(description="The value, or null while it is pending.")
    unit: str | None = Field(default=None, description="Unit of the value when it is a quantity.")

    def _payload_missing(self) -> bool | None:
        return self.value is None


class NumericValue(DomainMeta):
    """One numeric value of a domain table with its origin metadata."""

    value: Number | None
    unit: str | None = None

    def _payload_missing(self) -> bool | None:
        return self.value is None


class LocalizedText(Contract):
    """Bilingual text. A language that is not written yet is null, never machine-filled silently."""

    es: str | None
    en: str | None

    @model_validator(mode="after")
    def _has_one_language(self) -> "LocalizedText":
        if not (_has_text(self.es) or _has_text(self.en)):
            raise ValueError("a localized text needs at least one language")
        return self


class Practice(Contract):
    """One row of the practice table (domain/practices.yaml)."""

    practice_id: ConfigKey
    name_es: str = Field(min_length=1)
    name_en: str = Field(min_length=1)
    waterlogging_tolerance_days: NumericValue
    root_depth_cm: NumericValue
    soil_benefits: DomainValue
    cost_usd_ha: NumericValue
    labour: DomainValue
    risks: DomainValue
    sources: list[SourceRef]
    approved_by: str | None


class StrategyScores(Contract):
    """Criterion scores of a strategy; each keeps its own origin and approval."""

    soil: NumericValue
    water: NumericValue
    cost: NumericValue
    labour: NumericValue


class Strategy(Contract):
    """One soil-management strategy (domain/strategies.yaml and the app's strategies.json)."""

    strategy_id: ConfigKey
    lot_scope: list[str] = Field(
        min_length=1,
        description="Unit ids (lot, zone or farm) the strategy applies to; [\"*\"] marks a regional default for every unit.",
    )
    label: StrategyLabel
    what: LocalizedText
    why: LocalizedText
    evidence: list[SourceRef]
    benefits: LocalizedText
    gaps: LocalizedText
    risks: LocalizedText
    scores: StrategyScores
    approved_by: str | None = Field(description="'Tyson' once he approved the strategy, else null.")
    origin: Origin


class ActionEntry(DomainMeta):
    """Recommended action for one alert level in one mode (domain/actions.yaml)."""

    level: AlertLevel
    mode: Mode
    text: LocalizedText | None

    def _payload_missing(self) -> bool | None:
        return self.text is None


class GlossaryTerm(DomainMeta):
    """One agronomic term (domain/glossary.yaml)."""

    term_id: ConfigKey
    term: LocalizedText
    definition: LocalizedText | None

    def _payload_missing(self) -> bool | None:
        return self.definition is None


class PracticesFile(Contract):
    """domain/practices.yaml."""

    practices: list[Practice]


class StrategiesDomainFile(Contract):
    """domain/strategies.yaml."""

    strategies: list[Strategy]


class ActionsFile(Contract):
    """domain/actions.yaml."""

    actions: list[ActionEntry]


class ThresholdsFile(Contract):
    """domain/thresholds.yaml: agronomic thresholds by key, each with its origin metadata."""

    thresholds: dict[ConfigKey, DomainValue]


class FloodMemoriesFile(Contract):
    """domain/flood_memories.yaml."""

    flood_memories: list[FloodMemory]


class GlossaryFile(Contract):
    """domain/glossary.yaml."""

    terms: list[GlossaryTerm]


# --------------------------------------------------------------------------------------------------------
# App data snapshots (app/public/data/demo/, CONTRACTS.md §4)
# --------------------------------------------------------------------------------------------------------


def _unique(values: list[str], what: str) -> None:
    if len(values) != len(set(values)):
        raise ValueError(f"duplicate {what}")


class ReplayWindow(Contract):
    """First and last day of the replay."""

    start: dt.date
    end: dt.date

    @model_validator(mode="after")
    def _ordered(self) -> "ReplayWindow":
        if self.start > self.end:
            raise ValueError("replay window start is after its end")
        return self


class AppManifest(Contract):
    """manifest.json: what the snapshot set was built from. Holds the full provenance records by id."""

    schema_version: str = Field(pattern=r"^[0-9]+\.[0-9]+\.[0-9]+$", description="Contract version the files follow.")
    farm_id: FarmId
    generated_at: UtcDatetime
    engine_commit: str | None = Field(description="Git commit of the engine that wrote the snapshots.")
    replay_window: ReplayWindow
    provenance: list[Provenance] = Field(min_length=1)

    @model_validator(mode="after")
    def _unique_ids(self) -> "AppManifest":
        _unique([record.id for record in self.provenance], "provenance id")
        return self


class FarmFile(Contract):
    """farm.json: a farm with its lots (domain/farm.json and the demo snapshot)."""

    farm: Farm
    lots: list[Lot]
    provenance: ProvenanceBlock

    @model_validator(mode="after")
    def _lots_belong_to_farm(self) -> "FarmFile":
        slug = self.farm.id.removeprefix("farm_")
        _unique([lot.id for lot in self.lots], "lot id")
        for lot in self.lots:
            if lot.farm_id != self.farm.id:
                raise ValueError(f"{lot.id}: farm_id does not match the farm")
            if not lot.id.startswith(f"lot_{slug}_"):
                raise ValueError(f"{lot.id}: lot ids are lot_<farm slug>_<n>")
        return self


class ZoneFeature(Contract):
    """GeoJSON Feature of a terrain zone."""

    type: Literal["Feature"]
    geometry: Polygon | MultiPolygon
    properties: ZoneProperties


class ZonesFile(Contract):
    """zones.geojson: the TWI terciles of the farm as a GeoJSON FeatureCollection."""

    type: Literal["FeatureCollection"]
    features: list[ZoneFeature]
    provenance: ProvenanceBlock

    @model_validator(mode="after")
    def _unique_zones(self) -> "ZonesFile":
        _unique([feature.properties.id for feature in self.features], "zone id")
        return self


class CatchmentProperties(Contract):
    """Attributes of the upstream catchment. Extra keys are allowed; their numbers take `origin`."""

    model_config = ConfigDict(extra="allow", allow_inf_nan=False)

    catchment_id: str = Field(min_length=1)
    river: str | None = Field(default=None, description="Name of the river, as read from a source.")
    origin: OriginSpec


class CatchmentFeature(Contract):
    """GeoJSON Feature of the upstream catchment."""

    type: Literal["Feature"]
    geometry: Polygon | MultiPolygon
    properties: CatchmentProperties


class CatchmentFile(Contract):
    """catchment.geojson: simplified outline of the upstream catchment."""

    type: Literal["FeatureCollection"]
    features: list[CatchmentFeature] = Field(min_length=1)
    provenance: ProvenanceBlock


class ReplayUnit(Contract):
    """One unit on one replay day."""

    unit_id: UnitId
    alert: AlertState
    features: DailyFeature | None = Field(description="That day's features, or null when none exist for the unit.")


class ReplayDay(Contract):
    """replay/<YYYY-MM-DD>.json: every unit's alert state and features on one day.

    v1 addition to the draft: `events`, so the Alerts screen works offline in replay.
    """

    date: dt.date
    generated_at: UtcDatetime
    provenance: ProvenanceBlock
    units: list[ReplayUnit]
    events: list[AlertEvent] = Field(default_factory=list, description="Level transitions that happened on this day.")

    @model_validator(mode="after")
    def _consistent(self) -> "ReplayDay":
        _unique([unit.unit_id for unit in self.units], "unit id")
        for unit in self.units:
            if unit.alert.unit_id != unit.unit_id:
                raise ValueError(f"{unit.unit_id}: alert.unit_id does not match")
            if unit.features is not None and (unit.features.unit_id != unit.unit_id or unit.features.date != self.date):
                raise ValueError(f"{unit.unit_id}: features belong to another unit or day")
        return self


def _columnar_fields(model: type[BaseModel], exclude: frozenset[str] = frozenset()) -> dict[str, Any]:
    """Turn the fields of a per-day model into per-day arrays, keeping names, bounds and descriptions."""
    fields: dict[str, Any] = {}
    for name, info in model.model_fields.items():
        if name in exclude:
            continue
        annotation = info.annotation
        if isinstance(annotation, type) and issubclass(annotation, BaseModel):
            nested = create_model(
                f"History{annotation.__name__}",
                __base__=Contract,
                __doc__=f"{annotation.__name__} as one array per field, aligned with `dates`.",
                **_columnar_fields(annotation),
            )
            fields[name] = (nested, ...)
        else:
            element = Annotated[(annotation, *info.metadata)] if info.metadata else annotation
            fields[name] = (list[element], Field(description=info.description))
    return fields


HistorySeries = create_model(
    "HistorySeries",
    __base__=Contract,
    __doc__=(
        "DailyFeature as one array per field, aligned with `dates` (same names and bounds as DailyFeature). "
        "`origin` gives the origin per series; `soil_moisture_origin` gives it per day when it varies."
    ),
    origin=(OriginSpec, ...),
    soil_moisture_origin=(
        list[Origin | None] | None,
        Field(default=None, description="Per-day origin of soil_moisture (sourced from SMAP, estimated from API)."),
    ),
    **_columnar_fields(DailyFeature, exclude=frozenset({"unit_id", "date", "provenance_ids", "origin"})),
)


def _series_lengths(series: BaseModel) -> list[tuple[str, int]]:
    lengths: list[tuple[str, int]] = []
    for name in type(series).model_fields:
        value = getattr(series, name)
        if isinstance(value, BaseModel):
            lengths.extend((f"{name}.{inner}", size) for inner, size in _series_lengths(value))
        elif isinstance(value, list):
            lengths.append((name, len(value)))
    return lengths


class HistoryFile(Contract):
    """history/<unit_id>.json: up to 90 days of features for charts, as arrays aligned with `dates`."""

    unit_id: UnitId
    generated_at: UtcDatetime
    provenance: ProvenanceBlock
    dates: list[dt.date]
    series: HistorySeries  # type: ignore[valid-type]

    @model_validator(mode="after")
    def _aligned(self) -> "HistoryFile":
        if any(later <= earlier for earlier, later in zip(self.dates, self.dates[1:])):
            raise ValueError("dates must be strictly increasing")
        for name, size in _series_lengths(self.series):
            if size != len(self.dates):
                raise ValueError(f"series.{name} has {size} values for {len(self.dates)} dates")
        return self


class StrategiesFile(Contract):
    """strategies.json: the strategies with their scores and approval status."""

    generated_at: UtcDatetime
    provenance: ProvenanceBlock
    strategies: list[Strategy]

    @model_validator(mode="after")
    def _unique_strategies(self) -> "StrategiesFile":
        _unique([strategy.strategy_id for strategy in self.strategies], "strategy id")
        return self


class VerificationEvent(Contract):
    """One row of the verification table."""

    id: str = Field(min_length=1)
    kind: VerificationEventKind
    start: dt.date
    end: dt.date | None
    outcome: VerificationOutcome
    unit_ids: list[str]
    description: str | None
    sources: list[SourceRef]

    @model_validator(mode="after")
    def _kind_matches_outcome(self) -> "VerificationEvent":
        is_false_alarm = self.outcome == VerificationOutcome.false_alarm
        if is_false_alarm != (self.kind == VerificationEventKind.alert_without_flood):
            raise ValueError("an alert without a flood is a false alarm, and only that is one")
        return self


def _ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


class VerificationFile(Contract):
    """verification.json: counts first, then the ratios those counts give (SPEC, Prediction science, method 14).

    POD = hits / (hits + misses); FAR = false alarms / (hits + false alarms);
    CSI = hits / (hits + misses + false alarms). A ratio whose denominator is zero is null.
    """

    generated_at: UtcDatetime
    provenance: ProvenanceBlock
    events: list[VerificationEvent]
    hits: Count = Field(ge=0)
    misses: Count = Field(ge=0)
    false_alarms: Count = Field(ge=0)
    pod: Fraction | None
    far: Fraction | None
    csi: Fraction | None
    origin: OriginSpec
    notes: str | None

    @model_validator(mode="after")
    def _ratios_follow_counts(self) -> "VerificationFile":
        counted = {outcome: 0 for outcome in VerificationOutcome}
        for event in self.events:
            counted[event.outcome] += 1
        stated = {
            VerificationOutcome.hit: self.hits,
            VerificationOutcome.miss: self.misses,
            VerificationOutcome.false_alarm: self.false_alarms,
        }
        if counted != stated:
            raise ValueError("hits, misses and false_alarms must equal the number of events with each outcome")
        expected = {
            "pod": _ratio(self.hits, self.hits + self.misses),
            "far": _ratio(self.false_alarms, self.hits + self.false_alarms),
            "csi": _ratio(self.hits, self.hits + self.misses + self.false_alarms),
        }
        for name, value in expected.items():
            given = getattr(self, name)
            if (given is None) != (value is None) or (value is not None and not math.isclose(given, value, abs_tol=1e-9)):
                raise ValueError(f"{name} does not follow from the counts")
        return self


# --------------------------------------------------------------------------------------------------------
# Config files (config/, CONTRACTS.md §5)
# --------------------------------------------------------------------------------------------------------


class AlertParam(Contract):
    """One parameter of config/alerts.yaml: value, origin, source or reason, last_changed.

    A parameter that does not exist yet is `value: null, origin: pending`. Changing a weight or a threshold
    is class A (CLAUDE.md §6).
    """

    value: Any | None
    origin: AlertParamOrigin
    source: str | None = Field(default=None, description="Where the value was read, or the calibration note id.")
    reason: str | None = Field(default=None, description="Why the value is estimated, a design choice, or pending.")
    last_changed: dt.date
    unit: str | None = None
    estimated_by: str | None = None
    task_id: TaskId | None = Field(default=None, description="TASKS.md item that replaces an estimated value.")
    notes: str | None = None

    @model_validator(mode="after")
    def _origin_has_its_metadata(self) -> "AlertParam":
        written_as_text = _number_text_inside(self.value)
        if written_as_text is not None:
            raise ValueError(
                f"number written as text {written_as_text!r}: write it as a YAML number with a decimal point "
                "(PyYAML reads 1e-3 as text; write 0.001 or 1.0e-3)"
            )
        if not (_has_text(self.source) or _has_text(self.reason)):
            raise ValueError("a parameter needs a source or a reason")
        if _is_unverified(self.source):
            raise ValueError("an UNVERIFIED source cannot back a parameter")
        if (self.value is None) != (self.origin == AlertParamOrigin.pending):
            raise ValueError("a parameter is null exactly when its origin is 'pending'")
        if self.origin in (AlertParamOrigin.sourced, AlertParamOrigin.calibrated) and not _has_text(self.source):
            raise ValueError(f"origin '{self.origin.value}' needs a source")
        if self.origin in (AlertParamOrigin.design, AlertParamOrigin.pending) and not _has_text(self.reason):
            raise ValueError(f"origin '{self.origin.value}' needs a reason")
        if self.origin == AlertParamOrigin.estimated and not (
            _has_text(self.estimated_by) and _has_text(self.reason) and self.task_id is not None
        ):
            raise ValueError("origin 'estimated' needs estimated_by, reason and task_id")
        return self


def _number_text_inside(value: Any) -> str | None:
    """The first string holding a number inside a parameter value (lists and maps included), or None."""
    if is_number_text(value):
        return value
    items = value.values() if isinstance(value, Mapping) else value if isinstance(value, (list, tuple)) else ()
    for item in items:
        found = _number_text_inside(item)
        if found is not None:
            return found
    return None


def _number(param: AlertParam) -> float | None:
    value = param.value
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def _require_numbers(model: BaseModel) -> None:
    """Weights and thresholds are numbers or null (pending); anything else would skip the checks below."""
    for name in type(model).model_fields:
        param = getattr(model, name)
        if param.value is not None and _number(param) is None:
            raise ValueError(f"{name} must be a number or null, not {type(param.value).__name__}")


class AlertWeights(Contract):
    """Weights of the five indicators of W. Once all five exist they sum to 1 (SPEC: sum of w_i = 1)."""

    upstream: AlertParam
    saturation: AlertParam
    terrain: AlertParam
    local: AlertParam
    balance: AlertParam

    @model_validator(mode="after")
    def _sum_to_one(self) -> "AlertWeights":
        _require_numbers(self)
        values = [_number(getattr(self, name)) for name in type(self).model_fields]
        if all(value is not None for value in values):
            if any(not 0 <= value <= 1 for value in values):  # type: ignore[operator]
                raise ValueError("each weight lies in 0..1")
            if not math.isclose(sum(values), 1.0, abs_tol=1e-9):  # type: ignore[arg-type]
                raise ValueError("the five weights must sum to 1")
        return self


class AlertThresholds(Contract):
    """One threshold of W per level above Normal."""

    watch: AlertParam
    warning: AlertParam
    severe: AlertParam

    @model_validator(mode="after")
    def _ascending(self) -> "AlertThresholds":
        _require_numbers(self)
        values = [_number(self.watch), _number(self.warning), _number(self.severe)]
        if all(value is not None for value in values) and not values[0] < values[1] < values[2]:  # type: ignore[operator]
            raise ValueError("thresholds must rise from watch to warning to severe")
        return self


class SigatokaParams(Contract):
    """Parameters of the Sigatoka side indicator."""

    t_mean_c: AlertParam
    rh_mean: AlertParam
    rh_unfavourable: AlertParam
    days: AlertParam
    leaf_wet_rh: AlertParam


class ColdParams(Contract):
    """Parameters of the cold-stress side indicator."""

    base_c: AlertParam
    weekly_threshold_rule: AlertParam


class AlertsConfig(Contract):
    """config/alerts.yaml: every weight, threshold and engine parameter in one file (owner: data-scientist).

    Further parameters may be added as extra top-level keys holding an AlertParam or a map of AlertParams.
    """

    model_config = ConfigDict(extra="allow", allow_inf_nan=False)
    __pydantic_extra__: dict[str, AlertParam | dict[str, AlertParam]] = Field(init=False)

    weights: AlertWeights
    levels: AlertThresholds = Field(description="W at or above which a unit escalates to each level.")
    deescalate: AlertThresholds = Field(description="W below which a unit leaves each level (hysteresis).")
    severe_confirmations: AlertParam
    stale_after_hours: AlertParam
    waterlogging_days_floor_warning: AlertParam
    root_depth_cm: AlertParam
    api_k: AlertParam
    curve_number_by_cover_soil: AlertParam
    travel_lag_hours: AlertParam
    sigatoka: SigatokaParams
    cold: ColdParams

    @model_validator(mode="after")
    def _deescalation_is_below_escalation(self) -> "AlertsConfig":
        for name in ("watch", "warning", "severe"):
            up = _number(getattr(self.levels, name))
            down = _number(getattr(self.deescalate, name))
            if up is not None and down is not None and not down < up:
                raise ValueError(f"deescalate.{name} must be below levels.{name}")
        return self


class DatasetEntry(Contract):
    """One dataset in config/datasets.yaml. Every identifier stays null until data-engineer verified it.

    v1 additions to the draft: `origin` (pending until verified, then sourced) and `notes`.
    """

    key: ConfigKey = Field(description="Demenova's own key for the dataset; not a provider identifier.")
    provider: str | None
    short_name: str | None = Field(description="Exact product short name, as read on the official page.")
    version: str | None
    url_opened: str | None = Field(description="Official page that was actually opened.")
    accessed: dt.date | UtcDatetime | None
    spatial_res: str | None = Field(description="As published.")
    temporal_res: str | None = Field(description="As published.")
    latency: str | None = Field(description="As published.")
    variables: list[str] | None
    use_in_demenova: str | None
    verified_by: str | None
    origin: DatasetOrigin
    notes: str | None = None

    @model_validator(mode="after")
    def _verified_or_empty(self) -> "DatasetEntry":
        identifiers = ("provider", "short_name", "version", "url_opened", "accessed", "spatial_res", "temporal_res", "latency", "variables", "verified_by")
        if self.origin == DatasetOrigin.pending:
            filled = [name for name in identifiers if getattr(self, name) is not None]
            if filled:
                raise ValueError(f"origin is 'pending', so these must be null until verified: {', '.join(filled)}")
            return self
        for name in ("provider", "short_name", "url_opened", "verified_by"):
            value = getattr(self, name)
            if not _has_text(value) or _is_unverified(value):
                raise ValueError(f"a sourced dataset needs a verified {name}")
        if self.accessed is None:
            raise ValueError("a sourced dataset needs the date its page was opened")
        if _is_unverified(self.version):
            raise ValueError("an UNVERIFIED version cannot be sourced")
        return self


class DatasetsConfig(Contract):
    """config/datasets.yaml (owner: data-engineer)."""

    datasets: list[DatasetEntry]

    @model_validator(mode="after")
    def _unique_keys(self) -> "DatasetsConfig":
        _unique([entry.key for entry in self.datasets], "dataset key")
        return self


# --------------------------------------------------------------------------------------------------------
# Registries used by scripts/export_contracts.py and tests/test_contracts.py
# --------------------------------------------------------------------------------------------------------

# JSON Schema file (relative to docs/contracts/schemas/) -> model or type it is generated from.
JSON_SCHEMAS: dict[str, Any] = {
    "entities/farm.schema.json": Farm,
    "entities/lot.schema.json": Lot,
    "entities/zone.schema.json": Zone,
    "entities/daily_feature.schema.json": DailyFeature,
    "entities/alert_state.schema.json": AlertState,
    "entities/alert_event.schema.json": AlertEvent,
    "entities/flood_memory.schema.json": FloodMemory,
    "entities/field_note.schema.json": FieldNote,
    "entities/practice.schema.json": Practice,
    "entities/strategy.schema.json": Strategy,
    "entities/email_log.schema.json": EmailLog,
    "entities/telegram_subscriber.schema.json": TelegramSubscriber,
    "entities/user_prefs.schema.json": UserPrefs,
    "entities/provenance.schema.json": Provenance,
    "entities/provenance_block.schema.json": ProvenanceBlock,
    "app-data/manifest.schema.json": AppManifest,
    "app-data/farm.schema.json": FarmFile,
    "app-data/zones.schema.json": ZonesFile,
    "app-data/catchment.schema.json": CatchmentFile,
    "app-data/replay_day.schema.json": ReplayDay,
    "app-data/history.schema.json": HistoryFile,
    "app-data/strategies.schema.json": StrategiesFile,
    "app-data/verification.schema.json": VerificationFile,
    "domain/practices.schema.json": PracticesFile,
    "domain/strategies.schema.json": StrategiesDomainFile,
    "domain/actions.schema.json": ActionsFile,
    "domain/thresholds.schema.json": ThresholdsFile,
    "domain/flood_memories.schema.json": FloodMemoriesFile,
    "domain/glossary.schema.json": GlossaryFile,
    "config/alerts.schema.json": AlertsConfig,
    "config/datasets.schema.json": DatasetsConfig,
}


@dataclass(frozen=True)
class DataFileContract:
    """A committed data file (glob relative to the repository root), its model and its size limit."""

    pattern: str
    model: type[BaseModel]
    max_bytes: int | None = None


_DEMO = "app/public/data/demo"

DATA_FILE_CONTRACTS: tuple[DataFileContract, ...] = (
    DataFileContract(f"{_DEMO}/manifest.json", AppManifest, 20 * KB),
    DataFileContract(f"{_DEMO}/farm.json", FarmFile, 100 * KB),
    DataFileContract(f"{_DEMO}/zones.geojson", ZonesFile, 150 * KB),
    DataFileContract(f"{_DEMO}/catchment.geojson", CatchmentFile, 150 * KB),
    DataFileContract(f"{_DEMO}/replay/*.json", ReplayDay, 40 * KB),
    DataFileContract(f"{_DEMO}/history/*.json", HistoryFile, 60 * KB),
    DataFileContract(f"{_DEMO}/strategies.json", StrategiesFile, 60 * KB),
    DataFileContract(f"{_DEMO}/verification.json", VerificationFile, 10 * KB),
    DataFileContract("domain/farm.json", FarmFile),
    DataFileContract("domain/practices.yaml", PracticesFile),
    DataFileContract("domain/strategies.yaml", StrategiesDomainFile),
    DataFileContract("domain/actions.yaml", ActionsFile),
    DataFileContract("domain/thresholds.yaml", ThresholdsFile),
    DataFileContract("domain/flood_memories.yaml", FloodMemoriesFile),
    DataFileContract("domain/glossary.yaml", GlossaryFile),
    DataFileContract("config/alerts.yaml", AlertsConfig),
    DataFileContract("config/datasets.yaml", DatasetsConfig),
)

DEMO_DATA_DIR = _DEMO
DEMO_DATA_MAX_TOTAL_BYTES = 5 * MB
