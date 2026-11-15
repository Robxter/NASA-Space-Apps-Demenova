// Risk map (SPEC 18): lots coloured by level over NASA GIBS imagery (lazy chunk with Leaflet). Layer switch: alert
// level, terrain wetness, rain in the last 24 h. Tapping a lot opens a sheet with name, level, W and "Open lot".
// GIBS layers were checked in the WMTS GetCapabilities (2026-11-14): ASTER_GDEM_Greyscale_Shaded_Relief
// (GoogleMapsCompatible_Level12, no time) and MODIS_Terra_CorrectedReflectance_TrueColor (Level9, daily).
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, EmptyState } from '../../components/ui';
import { DataValue } from '../../components/DataValue';
import { LevelBadge, LoadGate, ReplayDock, Segmented, StatusNotices } from '../../components/shell';
import { fromSpec, resolveOrigin } from '../../data/origin';
import { LEVEL_RANK } from '../../data/select';
import { resolveProvenance, sourceLabel } from '../../data/snapshots';
import { navigate } from '../../state/nav';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { displayQuantity } from '../../units';
import { formatDate } from '../../time';
import type { Lot, Severity } from '../../types/contracts';

type Layer = 'level' | 'terrain' | 'rain';
type Base = 'relief' | 'truecolor';

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
export const GIBS_LAYERS: Record<Base, { id: string; url: (date: string | null) => string; native: number }> = {
  relief: {
    id: 'ASTER_GDEM_Greyscale_Shaded_Relief',
    url: () => `${GIBS}/ASTER_GDEM_Greyscale_Shaded_Relief/default/GoogleMapsCompatible_Level12/{z}/{y}/{x}.jpg`,
    native: 12,
  },
  truecolor: {
    id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    url: (date) =>
      `${GIBS}/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date ?? 'default'}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    native: 9,
  },
};

const toLatLngs = (lot: Lot): L.LatLngExpression[][] =>
  lot.geometry.coordinates.map((ring) => ring.map((p) => [p[1] ?? 0, p[0] ?? 0] as [number, number]));

export default function MapView() {
  const { status, demo, day, date, unitById, unitName } = useData();
  const { prefs, t } = usePrefs();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.TileLayer | null>(null);
  const shapes = useRef(new Map<string, L.Polygon>());
  const prevLevels = useRef(new Map<string, Severity>());
  const [layer, setLayer] = useState<Layer>('level');
  const [baseName, setBaseName] = useState<Base>('relief');
  const [selected, setSelected] = useState<string | null>(null);
  // Zoom drives which labels fit (break-ui: 40 permanent labels overlap into an unreadable block).
  const [zoom, setZoom] = useState(0);
  const [hiddenLabels, setHiddenLabels] = useState(false);
  const lots = useMemo(() => demo?.farm?.lots ?? [], [demo]);
  const farm = demo?.farm?.farm;

  // Create the map and the lot shapes once per farm.
  useEffect(() => {
    if (!box.current || status !== 'ready') return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: false, maxZoom: 17 });
    map.current = m;
    m.on('zoomend', () => setZoom(m.getZoom()));
    const group: L.Polygon[] = [];
    for (const lot of lots) {
      const poly = L.polygon(toLatLngs(lot), { className: 'dn-lot-shape', color: 'currentColor', fillColor: 'currentColor' });
      poly.on('click', () => setSelected(lot.id));
      poly.addTo(m);
      shapes.current.set(lot.id, poly);
      group.push(poly);
    }
    // Bottom padding keeps lots clear of the replay dock and the lot sheet.
    if (group.length) m.fitBounds(L.featureGroup(group).getBounds(), { paddingTopLeft: [24, 24], paddingBottomRight: [24, 170] });
    else if (farm) m.setView([farm.location.coordinates[1] ?? 0, farm.location.coordinates[0] ?? 0], 14);
    const shapesNow = shapes.current;
    return () => {
      m.remove();
      map.current = null;
      base.current = null;
      shapesNow.clear();
    };
  }, [status, lots, farm]);

  // Imagery: relief is static; true colour follows the replay day.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const spec = GIBS_LAYERS[baseName];
    base.current?.remove();
    base.current = L.tileLayer(spec.url(date), { maxNativeZoom: spec.native, maxZoom: 17, crossOrigin: true }).addTo(m);
    base.current.bringToBack();
  }, [baseName, date, status, lots]);

  // Level, label and onset per lot for the current day and layer.
  useEffect(() => {
    const rainOf = (u: string) => {
      const f = unitById(u)?.features;
      return f ? displayQuantity('mm', f.rain_local_mm, prefs.units, prefs.language) : null;
    };
    let hidden = false;
    const labelled: { poly: L.Polygon; label: string; rank: number }[] = [];
    for (const lot of lots) {
      const poly = shapes.current.get(lot.id);
      const el = poly?.getElement();
      if (!poly || !el) continue;
      const unit = unitById(lot.id);
      const level = unit?.alert.level ?? null;
      if (layer === 'level' && level) el.setAttribute('data-level', level);
      else el.removeAttribute('data-level');
      const before = prevLevels.current.get(lot.id);
      if (level === 'severe' && before && before !== 'severe') {
        el.classList.add('is-onset');
        setTimeout(() => el.classList.remove('is-onset'), 2400);
      }
      if (level) prevLevels.current.set(lot.id, level);
      poly.unbindTooltip();
      let label: string | null = null;
      // Short labels keep small lots visible; the lot name is in the sheet and the tooltip's accessible text.
      if (layer === 'terrain') label = lot.twi_tercile ? t(`tercile.${lot.twi_tercile}`) : t('common.noData');
      if (layer === 'rain') {
        const q = rainOf(lot.id);
        const origin = resolveOrigin(unit?.features, 'rain_local_mm');
        label = q?.text && origin ? `${q.text} ${q.unit} · ${t(`origin.${origin}`)}` : t('common.noData');
      }
      if (layer === 'level') label = level ? t(`level.${level}`) : t('common.noData');
      // Permanent labels on every layer: on the level layer the word travels with the colour (CLAUDE.md §2).
      if (label) labelled.push({ poly, label, rank: level ? LEVEL_RANK[level] : -2 });
      el.setAttribute('aria-label', `${lot.name}: ${label ?? ''}`);
    }
    // Labels are placed worst level first; one that would overlap a placed label shows on tap instead, and the
    // legend keeps every colour paired with its word (break-ui: 40 permanent labels pile into an unreadable block).
    const placed: DOMRect[] = [];
    labelled.sort((x, y) => y.rank - x.rank);
    for (const { poly, label } of labelled) {
      poly.bindTooltip(label, { permanent: true, direction: 'center', opacity: 0.85 });
      const r = poly.getTooltip()?.getElement()?.getBoundingClientRect();
      if (r && placed.some((q) => r.left < q.right && q.left < r.right && r.top < q.bottom && q.top < r.bottom)) {
        poly.unbindTooltip();
        poly.bindTooltip(label, { permanent: false, direction: 'center', opacity: 0.85 });
        hidden = true;
      } else if (r) placed.push(r);
    }
    setHiddenLabels(hidden);
  }, [lots, day, layer, prefs.units, prefs.language, t, unitById, zoom]);

  const sel = selected ? unitById(selected) : null;
  const source = sourceLabel(resolveProvenance(day?.provenance, demo?.manifest ?? null));
  const spec = GIBS_LAYERS[baseName];

  if (status !== 'ready') return <LoadGate />;

  return (
    <div className="relative flex h-[calc(100dvh-64px-env(safe-area-inset-bottom,0px))] flex-col overscroll-none">
      <div className="z-[1001] flex flex-col gap-2 bg-bg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <h1 className="m-0 text-title text-ink">{t('map.title')}</h1>
        <Segmented
          label={t('map.layer')}
          value={layer}
          onChange={setLayer}
          options={[
            { value: 'level', label: t('map.layer.level') },
            { value: 'terrain', label: t('map.layer.terrain') },
            { value: 'rain', label: t('map.layer.rain') },
          ]}
        />
        <Segmented
          label={t('map.base')}
          value={baseName}
          onChange={setBaseName}
          options={[
            { value: 'relief', label: t('map.base.relief') },
            { value: 'truecolor', label: t('map.base.truecolor') },
          ]}
        />
        <p className="m-0 line-clamp-2 text-footnote text-ink-3" title={source ?? undefined}>
          {date ? t('common.dataFrom', { time: formatDate(date, prefs.units) }) : null}
          {source ? ` · ${t('common.source', { source })}` : ''}
        </p>
        <p className="m-0 text-caption text-ink-3">{t('map.attribution', { layer: spec.id })}</p>
        {hiddenLabels && layer === 'level' ? (
          <div className="flex flex-wrap items-center gap-1.5" aria-label={t('map.legend')}>
            <span className="text-caption text-ink-3">{t('map.legendHint')}</span>
            {(['normal', 'watch', 'warning', 'severe', 'stale'] as const).map((lv) => (
              <LevelBadge key={lv} level={lv} size="sm" />
            ))}
          </div>
        ) : null}
      </div>
      <StatusNotices />
      {lots.length === 0 ? <EmptyState tone="missing" title={t('home.noUnits')} /> : null}
      <div ref={box} className="relative z-0 min-h-0 flex-1 text-ink" aria-label={t('map.title')} role="region" />

      <div className="absolute inset-x-0 bottom-3 z-[1001] px-3">
        {sel || selected ? (
          <div className="rounded-sheet bg-surface p-4 shadow-sheet">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="m-0 truncate text-headline text-ink">{unitName(selected ?? '')}</h2>
                <div className="mt-1">{sel ? <LevelBadge level={sel.alert.level} /> : null}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={t('common.close')}
                className="flex size-12 shrink-0 touch-manipulation select-none items-center justify-center rounded-full bg-surface-2 text-ink-2 active:scale-[0.95] transition-transform duration-[120ms] ease-standard"
              >
                <svg aria-hidden="true" viewBox="0 0 14 14" width="14" height="14">
                  <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <DataValue
                kind="index"
                si={sel?.alert.w ?? null}
                origin={sel ? fromSpec(sel.alert.origin, 'w') : null}
                source={source}
                at={sel?.alert.updated_at}
                label={t('w.label')}
                size="title"
              />
              <Button onClick={() => selected && navigate({ name: 'lot', id: selected })}>{t('map.openLot')}</Button>
            </div>
          </div>
        ) : (
          <ReplayDock />
        )}
      </div>
    </div>
  );
}
