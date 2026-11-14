/* eslint-disable */
// GENERATED FILE. Do not edit by hand.
// Source of truth: pipeline/common/models.py (docs/contracts/CONTRACTS.md, ADR-005).
// Regenerate:      uv run python scripts/export_contracts.py
// Drift check:     uv run pytest tests/test_contracts.py

export const CONTRACT_VERSION = "1.0.0";

/** Recommended action for one alert level in one mode (domain/actions.yaml). */
export interface ActionEntry {
  origin: Origin;
  /** URL that was opened, 'Tyson, <date>', or a calibration note id. */
  source?: string | null;
  /** Date the source URL was opened. */
  accessed?: string | null;
  /** Why the value is estimated, a design choice, or still pending. */
  reason?: string | null;
  estimated_by?: string | null;
  /** TASKS.md item that replaces an estimated value. */
  task_id?: string | null;
  to_be_redefined_by?: string | null;
  /** 'Tyson' once he approved it, else null. */
  approved_by?: string | null;
  level: AlertLevel;
  mode: Mode;
  text: LocalizedText | null;
}

/** domain/actions.yaml. */
export interface ActionsFile {
  actions: ActionEntry[];
}

/** A level transition of a unit (Supabase `alert_events`). v1 addition to the draft: `origin`. */
export interface AlertEvent {
  /** ULID (26 characters, Crockford base32). */
  id: string;
  /** The unit an alert or feature refers to: a lot id, a zone id, or the farm id itself when the farm is at data level 0 and has neither lots nor zones. */
  unit_id: string;
  from_level: Severity;
  to_level: Severity;
  w: number | null;
  factors: Factor[];
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  at: string;
  email_sent: boolean;
  telegram_sent: boolean;
  origin: OriginSpec;
}

/** The four severity levels that carry a recommended action (Severity without `stale`). */
export const ALERT_LEVEL_VALUES = ["normal", "watch", "warning", "severe"] as const;
export type AlertLevel = (typeof ALERT_LEVEL_VALUES)[number];

/** One parameter of config/alerts.yaml: value, origin, source or reason, last_changed. A parameter that does not exist yet is `value: null, origin: pending`. Changing a weight or a threshold is class A (CLAUDE.md §6). */
export interface AlertParam {
  value: unknown;
  origin: AlertParamOrigin;
  /** Where the value was read, or the calibration note id. */
  source?: string | null;
  /** Why the value is estimated, a design choice, or pending. */
  reason?: string | null;
  last_changed: string;
  unit?: string | null;
  estimated_by?: string | null;
  /** TASKS.md item that replaces an estimated value. */
  task_id?: string | null;
  notes?: string | null;
}

/** Origins allowed for a parameter in config/alerts.yaml (no user-provided or synthetic parameters). */
export const ALERT_PARAM_ORIGIN_VALUES = ["sourced", "calibrated", "estimated", "design", "pending"] as const;
export type AlertParamOrigin = (typeof ALERT_PARAM_ORIGIN_VALUES)[number];

/** Current alert state of a unit (Supabase `alert_states`). v1 addition to the draft: `origin`. */
export interface AlertState {
  /** The unit an alert or feature refers to: a lot id, a zone id, or the farm id itself when the farm is at data level 0 and has neither lots nor zones. */
  unit_id: string;
  level: Severity;
  /** Alert index W, 0..1; null when it cannot be computed. */
  w: number | null;
  factors: Factor[];
  /** When the current level began. */
  since: string;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  updated_at: string;
  newest_rain_data_at: string | null;
  /** Consecutive updates that agree on an escalation to Severe. */
  confirmations: number;
  /** Confidence badge, tied to the farm's data level. */
  confidence: number;
  side: SideIndicators;
  origin: OriginSpec;
}

/** One threshold of W per level above Normal. */
export interface AlertThresholds {
  watch: AlertParam;
  warning: AlertParam;
  severe: AlertParam;
}

/** Weights of the five indicators of W. Once all five exist they sum to 1 (SPEC: sum of w_i = 1). */
export interface AlertWeights {
  upstream: AlertParam;
  saturation: AlertParam;
  terrain: AlertParam;
  local: AlertParam;
  balance: AlertParam;
}

/** config/alerts.yaml: every weight, threshold and engine parameter in one file (owner: data-scientist). Further parameters may be added as extra top-level keys holding an AlertParam or a map of AlertParams. */
export interface AlertsConfig {
  weights: AlertWeights;
  /** W at or above which a unit escalates to each level. */
  levels: AlertThresholds;
  /** W below which a unit leaves each level (hysteresis). */
  deescalate: AlertThresholds;
  severe_confirmations: AlertParam;
  stale_after_hours: AlertParam;
  waterlogging_days_floor_warning: AlertParam;
  root_depth_cm: AlertParam;
  api_k: AlertParam;
  curve_number_by_cover_soil: AlertParam;
  travel_lag_hours: AlertParam;
  sigatoka: SigatokaParams;
  cold: ColdParams;
  [key: string]: unknown;
}

/** manifest.json: what the snapshot set was built from. Holds the full provenance records by id. */
export interface AppManifest {
  /** Contract version the files follow. */
  schema_version: string;
  /** farm_<slug>; the slug is lowercase letters, digits and single hyphens. */
  farm_id: string;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  generated_at: string;
  /** Git commit of the engine that wrote the snapshots. */
  engine_commit: string | null;
  replay_window: ReplayWindow;
  provenance: Provenance[];
}

/** Dates of the last bio-input applications on a lot. */
export interface Bioinputs {
  /** Date of the last mycorrhizae application. */
  mycorrhizae_last: string | null;
  /** Date of the last mountain-microorganism (MM) drench. */
  mm_last: string | null;
}

/** GeoJSON Feature of the upstream catchment. */
export interface CatchmentFeature {
  type: "Feature";
  geometry: Polygon | MultiPolygon;
  properties: CatchmentProperties;
}

/** catchment.geojson: simplified outline of the upstream catchment. */
export interface CatchmentFile {
  type: "FeatureCollection";
  features: CatchmentFeature[];
  provenance: ProvenanceBlock;
}

/** Attributes of the upstream catchment. Extra keys are allowed; their numbers take `origin`. */
export interface CatchmentProperties {
  catchment_id: string;
  /** Name of the river, as read from a source. */
  river?: string | null;
  origin: OriginSpec;
  [key: string]: unknown;
}

/** Parameters of the cold-stress side indicator. */
export interface ColdParams {
  base_c: AlertParam;
  weekly_threshold_rule: AlertParam;
}

/** Living cover on a lot. `mani_forrajero` is Arachis pintoi. */
export const COVER_CROP_VALUES = ["none", "mani_forrajero", "other"] as const;
export type CoverCrop = (typeof COVER_CROP_VALUES)[number];

/** Engine features of one unit on one day (Supabase `daily_features`). v1 additions to the draft: `ndvi_date` (the draft says 'ndvi (+date of image)') and `origin`. The origin usually differs per field: rain read from a dataset is `sourced`, soil moisture filled with the antecedent precipitation index is `estimated`. Use the map form of `origin` for that. */
export interface DailyFeature {
  /** The unit an alert or feature refers to: a lot id, a zone id, or the farm id itself when the farm is at data level 0 and has neither lots nor zones. */
  unit_id: string;
  date: string;
  rain_local_mm: number | null;
  rain_upstream_24h_mm: number | null;
  rain_upstream_48h_mm: number | null;
  rain_upstream_72h_mm: number | null;
  runoff_upstream_mm: number | null;
  /** Soil moisture as a 0..1 fraction, as published by its source. */
  soil_moisture: number | null;
  soil_moisture_source: SoilMoistureSource | null;
  /** Antecedent precipitation index. */
  api_index: number | null;
  /** Reference evapotranspiration. */
  et0_mm: number | null;
  /** Crop evapotranspiration. */
  etc_mm: number | null;
  /** Daily water balance. */
  balance_mm: number | null;
  /** 7-day running water balance. */
  balance_7d_mm: number | null;
  /** Consecutive days with a positive balance. */
  positive_balance_days: number | null;
  percentiles: Percentiles;
  /** Terrain-wetness rank within the farm, 0..1. */
  twi_rank: number | null;
  temp_mean_c: number | null;
  /** Mean relative humidity as a 0..1 fraction. */
  rh_mean: number | null;
  leaf_wet_hours: number | null;
  heat_units: number | null;
  ndvi: number | null;
  /** Date of the image the NDVI value comes from. */
  ndvi_date: string | null;
  provenance_ids: string[];
  origin: OriginSpec;
}

/** How much the farm has told Demenova: 0 pin, 1 outline + zones, 2 lots, 3 field notes. */
export const DATA_LEVEL_VALUES = [0, 1, 2, 3] as const;
export type DataLevel = (typeof DATA_LEVEL_VALUES)[number];

/** One dataset in config/datasets.yaml. Every identifier stays null until data-engineer verified it. v1 additions to the draft: `origin` (pending until verified, then sourced) and `notes`. */
export interface DatasetEntry {
  /** Demenova's own key for the dataset; not a provider identifier. */
  key: string;
  provider: string | null;
  /** Exact product short name, as read on the official page. */
  short_name: string | null;
  version: string | null;
  /** Official page that was actually opened. */
  url_opened: string | null;
  accessed: string | null;
  /** As published. */
  spatial_res: string | null;
  /** As published. */
  temporal_res: string | null;
  /** As published. */
  latency: string | null;
  variables: string[] | null;
  use_in_demenova: string | null;
  verified_by: string | null;
  origin: DatasetOrigin;
  notes?: string | null;
}

/** A dataset entry is either verified against its official page (sourced) or not yet (pending). */
export const DATASET_ORIGIN_VALUES = ["sourced", "pending"] as const;
export type DatasetOrigin = (typeof DATASET_ORIGIN_VALUES)[number];

/** config/datasets.yaml (owner: data-engineer). */
export interface DatasetsConfig {
  datasets: DatasetEntry[];
}

/** One value of a domain table with its origin metadata. */
export interface DomainValue {
  origin: Origin;
  /** URL that was opened, 'Tyson, <date>', or a calibration note id. */
  source?: string | null;
  /** Date the source URL was opened. */
  accessed?: string | null;
  /** Why the value is estimated, a design choice, or still pending. */
  reason?: string | null;
  estimated_by?: string | null;
  /** TASKS.md item that replaces an estimated value. */
  task_id?: string | null;
  to_be_redefined_by?: string | null;
  /** 'Tyson' once he approved it, else null. */
  approved_by?: string | null;
  /** The value, or null while it is pending. */
  value: unknown;
  /** Unit of the value when it is a quantity. */
  unit?: string | null;
}

/** Drainage class of a lot. */
export const DRAINAGE_CLASS_VALUES = ["good", "moderate", "poor"] as const;
export type DrainageClass = (typeof DRAINAGE_CLASS_VALUES)[number];

/** Drainage works present on a lot. */
export const DRAINAGE_WORKS_VALUES = ["none", "ditches", "other"] as const;
export type DrainageWorks = (typeof DRAINAGE_WORKS_VALUES)[number];

/** One alert email, used to send once per unit and Severe episode (Supabase `email_log`). */
export interface EmailLog {
  /** ULID (26 characters, Crockford base32). */
  id: string;
  /** The unit an alert or feature refers to: a lot id, a zone id, or the farm id itself when the farm is at data level 0 and has neither lots nor zones. */
  unit_id: string;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  episode_start: string;
  /** Hash of the recipient address; the address itself is never stored here. */
  to_hash: string;
  provider_id: string | null;
  status: EmailStatus;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  created_at: string;
}

/** Delivery status of an alert email. */
export const EMAIL_STATUS_VALUES = ["queued", "sent", "failed"] as const;
export type EmailStatus = (typeof EMAIL_STATUS_VALUES)[number];

/** One contributing factor of the alert index with its share of W. */
export interface Factor {
  name: FactorName;
  share: number;
}

/** The five indicators of the alert index W (docs/SPEC.md, Risk engine and weighted alerts). */
export const FACTOR_NAME_VALUES = ["upstream", "saturation", "terrain", "local", "balance"] as const;
export type FactorName = (typeof FACTOR_NAME_VALUES)[number];

/** A farm. Same fields in Supabase `farms`, in domain/farm.json and in the demo snapshot. v1 additions to the draft: `origin` (CONTRACTS.md §2 asks for origin metadata on every numeric field; it covers location, outline and data_level) and nullable country, province and canton (a farm that is only a pin has no way to know them). */
export interface Farm {
  /** farm_<slug>; the slug is lowercase letters, digits and single hyphens. */
  id: string;
  name: string;
  /** Supabase auth user id from anonymous sign-in (ADR-003). null for the demo farm and for local-only farms. */
  owner_id: string | null;
  country: string | null;
  province: string | null;
  canton: string | null;
  /** The farm pin (data level 0). */
  location: Point;
  /** Farm outline (data level 1 and above), else null. */
  outline: Polygon | null;
  data_level: DataLevel;
  crop: string;
  variety: string | null;
  variety_origin: Origin;
  /** Id of the upstream catchment that drains to the farm. */
  catchment_id: string | null;
  /** Recipient of Severe emails. Personal data: always null on the demo farm, whose recipient is the backend environment variable ALERT_EMAIL_TO. */
  alert_email: string | null;
  language: Language;
  units: UnitSystem;
  mode: Mode;
  storage_mode: StorageMode;
  /** True only for the synthetic demo farm, which the UI labels 'Demo'. */
  is_demo: boolean;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  created_at: string;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  updated_at: string;
  origin: OriginSpec;
}

/** farm.json: a farm with its lots (domain/farm.json and the demo snapshot). */
export interface FarmFile {
  farm: Farm;
  lots: Lot[];
  provenance: ProvenanceBlock;
}

/** A data-level-3 field note (Supabase `field_notes`). `origin` covers every value in `value_json`. */
export interface FieldNote {
  /** ULID when created by the app. */
  id: string;
  /** lot_<farm slug>_<n>. */
  lot_id: string;
  kind: FieldNoteKind;
  date: string;
  value_json: Record<string, unknown>;
  origin: Origin;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  created_at: string;
}

/** Kind of a data-level-3 field note. */
export const FIELD_NOTE_KIND_VALUES = ["soil_analysis", "water_table", "management", "other"] as const;
export type FieldNoteKind = (typeof FIELD_NOTE_KIND_VALUES)[number];

/** domain/flood_memories.yaml. */
export interface FloodMemoriesFile {
  flood_memories: FloodMemory[];
}

/** A past flood remembered by the farmer (Supabase `flood_memories`, domain/flood_memories.yaml). */
export interface FloodMemory {
  /** ULID when created by the app. */
  id: string;
  /** farm_<slug>; the slug is lowercase letters, digits and single hyphens. */
  farm_id: string;
  /** YYYY-MM-DD or YYYY-MM. */
  date_or_month: string;
  /** Ids of the lots or of the zone the water reached; empty when unknown. */
  lots_or_zone: string[];
  days_with_water: number | null;
  damage_notes: string | null;
  reported_by: string;
  origin: "observed";
  /** Engine alert event matched to this memory, else null. */
  matched_event_id: string | null;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  created_at: string;
}

/** domain/glossary.yaml. */
export interface GlossaryFile {
  terms: GlossaryTerm[];
}

/** One agronomic term (domain/glossary.yaml). */
export interface GlossaryTerm {
  origin: Origin;
  /** URL that was opened, 'Tyson, <date>', or a calibration note id. */
  source?: string | null;
  /** Date the source URL was opened. */
  accessed?: string | null;
  /** Why the value is estimated, a design choice, or still pending. */
  reason?: string | null;
  estimated_by?: string | null;
  /** TASKS.md item that replaces an estimated value. */
  task_id?: string | null;
  to_be_redefined_by?: string | null;
  /** 'Tyson' once he approved it, else null. */
  approved_by?: string | null;
  term_id: string;
  term: LocalizedText;
  definition: LocalizedText | null;
}

/** history/<unit_id>.json: up to 90 days of features for charts, as arrays aligned with `dates`. */
export interface HistoryFile {
  /** The unit an alert or feature refers to: a lot id, a zone id, or the farm id itself when the farm is at data level 0 and has neither lots nor zones. */
  unit_id: string;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  generated_at: string;
  provenance: ProvenanceBlock;
  dates: string[];
  series: HistorySeries;
}

/** Percentiles as one array per field, aligned with `dates`. */
export interface HistoryPercentiles {
  upstream: (number | null)[];
  saturation: (number | null)[];
  local: (number | null)[];
  balance: (number | null)[];
}

/** DailyFeature as one array per field, aligned with `dates` (same names and bounds as DailyFeature). `origin` gives the origin per series; `soil_moisture_origin` gives it per day when it varies. */
export interface HistorySeries {
  origin: OriginSpec;
  /** Per-day origin of soil_moisture (sourced from SMAP, estimated from API). */
  soil_moisture_origin?: (Origin | null)[] | null;
  rain_local_mm: (number | null)[];
  rain_upstream_24h_mm: (number | null)[];
  rain_upstream_48h_mm: (number | null)[];
  rain_upstream_72h_mm: (number | null)[];
  runoff_upstream_mm: (number | null)[];
  /** Soil moisture as a 0..1 fraction, as published by its source. */
  soil_moisture: (number | null)[];
  soil_moisture_source: (SoilMoistureSource | null)[];
  /** Antecedent precipitation index. */
  api_index: (number | null)[];
  /** Reference evapotranspiration. */
  et0_mm: (number | null)[];
  /** Crop evapotranspiration. */
  etc_mm: (number | null)[];
  /** Daily water balance. */
  balance_mm: (number | null)[];
  /** 7-day running water balance. */
  balance_7d_mm: (number | null)[];
  /** Consecutive days with a positive balance. */
  positive_balance_days: (number | null)[];
  percentiles: HistoryPercentiles;
  /** Terrain-wetness rank within the farm, 0..1. */
  twi_rank: (number | null)[];
  temp_mean_c: (number | null)[];
  /** Mean relative humidity as a 0..1 fraction. */
  rh_mean: (number | null)[];
  leaf_wet_hours: (number | null)[];
  heat_units: (number | null)[];
  ndvi: (number | null)[];
  /** Date of the image the NDVI value comes from. */
  ndvi_date: (string | null)[];
}

/** Qualitative incidence level. */
export const INCIDENCE_VALUES = ["low", "medium", "high"] as const;
export type Incidence = (typeof INCIDENCE_VALUES)[number];

/** Interface language. */
export const LANGUAGE_VALUES = ["en", "es"] as const;
export type Language = (typeof LANGUAGE_VALUES)[number];

/** Closed ring of positions (GeoJSON, RFC 7946). */
export type LinearRing = Position[];

/** Bilingual text. A language that is not written yet is null, never machine-filled silently. */
export interface LocalizedText {
  es: string | null;
  en: string | null;
}

/** A lot (data level 2). Same fields in Supabase `lots`, in domain/farm.json and in the demo snapshot. Every attribute the draft marks '(+origin)' has a required sibling `<field>_origin`. `origin` is the origin of everything else in the record (geometry, name, TWI values); use the map form when they differ, for example {"*": "synthetic", "twi_mean": "sourced"} for a demo lot drawn by an agent whose TWI comes from SRTM. */
export interface Lot {
  /** lot_<farm slug>_<n>. */
  id: string;
  /** farm_<slug>; the slug is lowercase letters, digits and single hyphens. */
  farm_id: string;
  name: string;
  geometry: Polygon;
  area_ha: number | null;
  area_ha_origin: Origin;
  plant_age_months: number | null;
  plant_age_months_origin: Origin;
  variety: string | null;
  variety_origin: Origin;
  drainage_class: DrainageClass | null;
  drainage_class_origin: Origin;
  drainage_works: DrainageWorks | null;
  drainage_works_origin: Origin;
  cover_crop: CoverCrop | null;
  cover_crop_origin: Origin;
  last_soil_analysis: SoilAnalysis | null;
  last_soil_analysis_origin: Origin;
  nematode_incidence: Incidence | null;
  nematode_incidence_origin: Origin;
  disease_notes: string | null;
  bioinputs: Bioinputs | null;
  bioinputs_origin: Origin;
  /** Mean topographic wetness index of the lot (engine output). */
  twi_mean: number | null;
  /** Maximum topographic wetness index of the lot (engine output). */
  twi_max: number | null;
  /** Terrain-wetness third of the lot within its farm. */
  twi_tercile: Tercile | null;
  /** Agent or person who defined the lot. */
  defined_by: string;
  /** Who must redefine the lot; required while it is synthetic. */
  to_be_redefined_by: string | null;
  origin: OriginSpec;
}

/** Farmer mode (one status, one alert, one action) or agronomist mode (full detail). */
export const MODE_VALUES = ["farmer", "agronomist"] as const;
export type Mode = (typeof MODE_VALUES)[number];

/** GeoJSON MultiPolygon. */
export interface MultiPolygon {
  type: "MultiPolygon";
  coordinates: LinearRing[][];
}

/** One numeric value of a domain table with its origin metadata. */
export interface NumericValue {
  origin: Origin;
  /** URL that was opened, 'Tyson, <date>', or a calibration note id. */
  source?: string | null;
  /** Date the source URL was opened. */
  accessed?: string | null;
  /** Why the value is estimated, a design choice, or still pending. */
  reason?: string | null;
  estimated_by?: string | null;
  /** TASKS.md item that replaces an estimated value. */
  task_id?: string | null;
  to_be_redefined_by?: string | null;
  /** 'Tyson' once he approved it, else null. */
  approved_by?: string | null;
  value: number | null;
  unit?: string | null;
}

/** Where a value comes from (docs/DATA_POLICY.md §1). Every stored or displayed value carries exactly one. */
export const ORIGIN_VALUES = ["sourced", "calibrated", "provided", "observed", "estimated", "synthetic", "design", "pending"] as const;
export type Origin = (typeof ORIGIN_VALUES)[number];

/** Origin of the values in the same object: either one origin for all of them, or a map from field name to origin where the key '*' is the default for fields not listed. A sibling '<field>_origin' always wins over this. */
export type OriginSpec = Origin | Record<string, Origin>;

/** Indicator percentiles against the unit's own history, as 0..1 fractions. */
export interface Percentiles {
  upstream: number | null;
  saturation: number | null;
  local: number | null;
  balance: number | null;
}

/** GeoJSON Point. */
export interface Point {
  type: "Point";
  coordinates: Position;
}

/** GeoJSON Polygon. */
export interface Polygon {
  type: "Polygon";
  coordinates: LinearRing[];
}

/** [longitude, latitude] in EPSG:4326 (optional altitude in m). */
export type Position = number[];

/** One row of the practice table (domain/practices.yaml). */
export interface Practice {
  practice_id: string;
  name_es: string;
  name_en: string;
  waterlogging_tolerance_days: NumericValue;
  root_depth_cm: NumericValue;
  soil_benefits: DomainValue;
  cost_usd_ha: NumericValue;
  labour: DomainValue;
  risks: DomainValue;
  sources: SourceRef[];
  approved_by: string | null;
}

/** domain/practices.yaml. */
export interface PracticesFile {
  practices: Practice[];
}

/** Provenance record attached to every data file (docs/DATA_POLICY.md §3). All fourteen keys are always present. A record either cites a dataset completely (dataset, version, provider, url and accessed all filled) or has `dataset: null` and says in `notes` what the content is instead (synthetic demo content, user input, a domain table). No field may hold UNVERIFIED or an unfilled <placeholder>. */
export interface Provenance {
  /** Identifier of a provenance record, for example prov-<dataset>-<period>. */
  id: string;
  /** Exact product short name, or null when the file is not dataset-backed. */
  dataset: string | null;
  /** Exact product version. */
  version: string | null;
  /** Data provider, as named on the page that was opened. */
  provider: string | null;
  /** Landing page or DOI that was actually opened. */
  url: string | null;
  /** When the source was opened (UTC). */
  accessed: string | null;
  /** As published by the provider. */
  spatial_resolution: string | null;
  /** As published by the provider. */
  temporal_resolution: string | null;
  /** Area-of-interest id the file was cut to. */
  aoi: string | null;
  /** [start, end] covered by the file; null for static data. */
  time_range: [string, string] | null;
  /** Ordered processing steps, including the resampling method. */
  processing: string[];
  /** Git commit of the code that produced the file. */
  code_commit: string | null;
  /** Agent or person who produced the file. */
  agent: string;
  notes: string;
}

/** The `provenance` member of a data file: one record, several records, or a manifest reference. */
export type ProvenanceBlock = Provenance | Provenance[] | ProvenanceRef;

/** Reference to provenance records kept in a manifest file, so small snapshot files stay small. */
export interface ProvenanceRef {
  /** Path of the manifest JSON, relative to the referring file. */
  ref: string;
  /** Ids of records embedded in that manifest. */
  ids: string[];
}

/** replay/<YYYY-MM-DD>.json: every unit's alert state and features on one day. v1 addition to the draft: `events`, so the Alerts screen works offline in replay. */
export interface ReplayDay {
  date: string;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  generated_at: string;
  provenance: ProvenanceBlock;
  units: ReplayUnit[];
  /** Level transitions that happened on this day. */
  events?: AlertEvent[];
}

/** One unit on one replay day. */
export interface ReplayUnit {
  /** The unit an alert or feature refers to: a lot id, a zone id, or the farm id itself when the farm is at data level 0 and has neither lots nor zones. */
  unit_id: string;
  alert: AlertState;
  /** That day's features, or null when none exist for the unit. */
  features: DailyFeature | null;
}

/** First and last day of the replay. */
export interface ReplayWindow {
  start: string;
  end: string;
}

/** The five alert states of a unit (CONTRACTS.md §2). `stale` means the newest rain data is too old. */
export const SEVERITY_VALUES = ["normal", "watch", "warning", "severe", "stale"] as const;
export type Severity = (typeof SEVERITY_VALUES)[number];

/** Side indicators shown on Lot detail, never in the email. */
export interface SideIndicators {
  sigatoka: Severity | null;
  cold: Severity | null;
}

/** Parameters of the Sigatoka side indicator. */
export interface SigatokaParams {
  t_mean_c: AlertParam;
  rh_mean: AlertParam;
  rh_unfavourable: AlertParam;
  days: AlertParam;
  leaf_wet_rh: AlertParam;
}

/** Last soil analysis of a lot. */
export interface SoilAnalysis {
  date: string | null;
  ph: number | null;
  /** Organic matter stored as a 0..1 fraction (CONTRACTS.md §2), so 3 % is 0.03. Displayed as a percentage. */
  organic_matter_pct: number | null;
}

/** Where a day's soil-moisture value came from: SMAP, or the antecedent precipitation index gap-fill. */
export const SOIL_MOISTURE_SOURCE_VALUES = ["smap", "api"] as const;
export type SoilMoistureSource = (typeof SOIL_MOISTURE_SOURCE_VALUES)[number];

/** A source somebody actually opened (docs/DATA_POLICY.md §2.4). Never list one that nobody opened. */
export interface SourceRef {
  /** Readable citation, for example 'Tyson, 14 Nov 2026' or an article title. */
  citation: string;
  /** URL that was opened, or null for a personal communication. */
  url: string | null;
  /** Date the URL was opened. */
  accessed: string | null;
}

/** Offline storage mode (ADR-004): full = status + 90 days + imagery cache; saver = status + 7 days. */
export const STORAGE_MODE_VALUES = ["full", "saver"] as const;
export type StorageMode = (typeof STORAGE_MODE_VALUES)[number];

/** domain/strategies.yaml. */
export interface StrategiesDomainFile {
  strategies: Strategy[];
}

/** strategies.json: the strategies with their scores and approval status. */
export interface StrategiesFile {
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  generated_at: string;
  provenance: ProvenanceBlock;
  strategies: Strategy[];
}

/** One soil-management strategy (domain/strategies.yaml and the app's strategies.json). */
export interface Strategy {
  strategy_id: string;
  /** Unit ids (lot, zone or farm) the strategy applies to; ["*"] marks a regional default for every unit. */
  lot_scope: string[];
  label: StrategyLabel;
  what: LocalizedText;
  why: LocalizedText;
  evidence: SourceRef[];
  benefits: LocalizedText;
  gaps: LocalizedText;
  risks: LocalizedText;
  scores: StrategyScores;
  /** 'Tyson' once he approved the strategy, else null. */
  approved_by: string | null;
  origin: Origin;
}

/** A = current management, B and C = the two alternatives. */
export const STRATEGY_LABEL_VALUES = ["A", "B", "C"] as const;
export type StrategyLabel = (typeof STRATEGY_LABEL_VALUES)[number];

/** Criterion scores of a strategy; each keeps its own origin and approval. */
export interface StrategyScores {
  soil: NumericValue;
  water: NumericValue;
  cost: NumericValue;
  labour: NumericValue;
}

/** A Telegram chat subscribed to a farm (Supabase `telegram_subscribers`). */
export interface TelegramSubscriber {
  /** Telegram chat id, encrypted or hashed where possible. */
  chat_id: string;
  /** farm_<slug>; the slug is lowercase letters, digits and single hyphens. */
  farm_id: string;
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  started_at: string;
  active: boolean;
}

/** Terrain-wetness third of a farm (TWI ranked within the farm). */
export const TERCILE_VALUES = ["low", "mid", "high"] as const;
export type Tercile = (typeof TERCILE_VALUES)[number];

/** Colour theme preference. */
export const THEME_VALUES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEME_VALUES)[number];

/** domain/thresholds.yaml: agronomic thresholds by key, each with its origin metadata. */
export interface ThresholdsFile {
  thresholds: Record<string, unknown>;
}

/** Display units. Storage is always SI; imperial is a display-only conversion. */
export const UNIT_SYSTEM_VALUES = ["metric", "imperial"] as const;
export type UnitSystem = (typeof UNIT_SYSTEM_VALUES)[number];

/** Preferences of one device (Supabase `user_prefs` and local storage). The draft says 'user_id/device_id'; v1 keeps both: `device_id` always exists, `user_id` is null while the app runs local-only because anonymous sign-in was unavailable (ADR-003). */
export interface UserPrefs {
  /** Supabase auth user id, or null in local-only mode. */
  user_id: string | null;
  /** Random id generated on the device at first launch. */
  device_id: string;
  language: Language;
  units: UnitSystem;
  mode: Mode;
  storage_mode: StorageMode;
  theme: Theme;
}

/** One row of the verification table. */
export interface VerificationEvent {
  id: string;
  kind: VerificationEventKind;
  start: string;
  end: string | null;
  outcome: VerificationOutcome;
  unit_ids: string[];
  description: string | null;
  sources: SourceRef[];
}

/** What an entry in the verification table is. */
export const VERIFICATION_EVENT_KIND_VALUES = ["documented_flood", "flood_memory", "alert_without_flood"] as const;
export type VerificationEventKind = (typeof VERIFICATION_EVENT_KIND_VALUES)[number];

/** verification.json: counts first, then the ratios those counts give (SPEC, Prediction science, method 14). POD = hits / (hits + misses); FAR = false alarms / (hits + false alarms); CSI = hits / (hits + misses + false alarms). A ratio whose denominator is zero is null. */
export interface VerificationFile {
  /** UTC timestamp, ISO 8601, with a 'Z' or '+00:00' offset. */
  generated_at: string;
  provenance: ProvenanceBlock;
  events: VerificationEvent[];
  hits: number;
  misses: number;
  false_alarms: number;
  pod: number | null;
  far: number | null;
  csi: number | null;
  origin: OriginSpec;
  notes: string | null;
}

/** Forecast-verification outcome of one event (docs/SPEC.md, Prediction science, method 14). */
export const VERIFICATION_OUTCOME_VALUES = ["hit", "miss", "false_alarm"] as const;
export type VerificationOutcome = (typeof VERIFICATION_OUTCOME_VALUES)[number];

/** A terrain zone as a flat record (Supabase `zones`). */
export interface Zone {
  /** zone_<farm slug>_<low|mid|high>. */
  id: string;
  /** farm_<slug>; the slug is lowercase letters, digits and single hyphens. */
  farm_id: string;
  tercile: Tercile;
  /** [min, max] topographic wetness index inside the zone. */
  twi_range: [number, number];
  origin: ZoneOrigin;
  geometry: Polygon | MultiPolygon;
}

/** GeoJSON Feature of a terrain zone. */
export interface ZoneFeature {
  type: "Feature";
  geometry: Polygon | MultiPolygon;
  properties: ZoneProperties;
}

/** Origins allowed for an automatic terrain zone (CONTRACTS.md §3). */
export const ZONE_ORIGIN_VALUES = ["calibrated", "sourced"] as const;
export type ZoneOrigin = (typeof ZONE_ORIGIN_VALUES)[number];

/** Attributes of an automatic terrain zone (data level 1): the `properties` of a zone feature. */
export interface ZoneProperties {
  /** zone_<farm slug>_<low|mid|high>. */
  id: string;
  /** farm_<slug>; the slug is lowercase letters, digits and single hyphens. */
  farm_id: string;
  tercile: Tercile;
  /** [min, max] topographic wetness index inside the zone. */
  twi_range: [number, number];
  origin: ZoneOrigin;
}

/** zones.geojson: the TWI terciles of the farm as a GeoJSON FeatureCollection. */
export interface ZonesFile {
  type: "FeatureCollection";
  features: ZoneFeature[];
  provenance: ProvenanceBlock;
}
