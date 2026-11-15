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
import { flood, makeLabel, setLabelLevel, setTooltipLevel, tokenMs } from './flood';
import { addBase, creditKey, gibsLayerName, type BaseId } from './baseLayers';
import { BaseSelect } from '../../components/BaseSelect';
import { resolveProvenance, sourceLabel } from '../../data/snapshots';
import { navigate } from '../../state/nav';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { displayQuantity } from '../../units';
import { formatDate } from '../../time';
import type { Lot, Severity } from '../../types/contracts';

type Layer = 'level' | 'terrain' | 'rain';
type Box = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;
const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const toLatLngs = (lot: Lot): L.LatLngExpression[][] =>
  lot.geometry.coordinates.map((ring) => ring.map((p) => [p[1] ?? 0, p[0] ?? 0] as [number, number]));

export default function MapView() {
  const { status, demo, day, date, index, playing, unitById, unitName } = useData();
  const { prefs, t } = usePrefs();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.Layer[]>([]);
  const shapes = useRef(new Map<string, L.Polygon>());
  const prevIndex = useRef<number | null>(null);
  const floodEpoch = useRef(0);
  const labels = useRef(new Map<string, { root: HTMLSpanElement; word: HTMLSpanElement }>());
  const [layer, setLayer] = useState<Layer>('level');
  const [baseName, setBaseName] = useState<BaseId>('satellite');
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
      base.current = [];
      shapesNow.clear();
    };
  }, [status, lots, farm]);

  // Imagery: relief is static; true colour follows the replay day.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    base.current.forEach((l) => l.remove());
    // The base sits in Leaflet's tile pane, under the lots (overlay pane), whatever the order of creation.
    base.current = addBase(m, baseName, date);
  }, [baseName, date, status, lots]);

  // Level, label and the Severe moment per lot for the current day and layer.
  useEffect(() => {
    const rainOf = (u: string) => {
      const f = unitById(u)?.features;
      return f ? displayQuantity('mm', f.rain_local_mm, prefs.units, prefs.language) : null;
    };
    // CL-29: the Flood plays only on a forward one-day step of the replay (play), never on drag-scrub, first load,
    // a Lot open or a backward step. A newer day cancels a running sweep (epoch).
    const forwardStep = playing && prevIndex.current !== null && index === prevIndex.current + 1;
    prevIndex.current = index;
    const epoch = ++floodEpoch.current;
    const alive = () => floodEpoch.current === epoch;
    const prevDay = forwardStep && demo ? (demo.replay[demo.days[index - 1] ?? ''] ?? null) : null;
    const prevLevel = (id: string) => prevDay?.units.find((u) => u.unit_id === id)?.alert.level ?? null;

    let hidden = false;
    const labelled: { lot: Lot; poly: L.Polygon; text: string; level: Severity | null; flooding: boolean; rank: number }[] = [];
    for (const lot of lots) {
      const poly = shapes.current.get(lot.id);
      const el = poly?.getElement() as SVGPathElement | undefined;
      if (!poly || !el) continue;
      const unit = unitById(lot.id);
      const level = unit?.alert.level ?? null;
      if (layer === 'level' && level) el.setAttribute('data-level', level);
      else el.removeAttribute('data-level');
      const flooding = layer === 'level' && level === 'severe' && forwardStep && prevLevel(lot.id) !== null && prevLevel(lot.id) !== 'severe';
      if (flooding) flood(el, alive);
      let text: string;
      // Short labels keep small lots visible; the lot name is in the sheet and the shape's accessible name.
      if (layer === 'terrain') text = lot.twi_tercile ? t(`tercile.${lot.twi_tercile}`) : t('common.noData');
      else if (layer === 'rain') {
        const q = rainOf(lot.id);
        const origin = resolveOrigin(unit?.features, 'rain_local_mm');
        text = q?.text && origin ? `${q.text} ${q.unit}, ${t(`origin.${origin}`)}` : t('common.noData');
      } else text = level ? t(`level.${level}`) : t('common.noData');
      el.setAttribute('aria-label', `${lot.name}: ${text}`);
      labelled.push({ lot, poly, text, level: layer === 'level' ? level : null, flooding, rank: level ? LEVEL_RANK[level] : -2 });
    }

    // CL-05 labels: one element per lot (core + word) above the lot, kept across days so the core water rises in
    // place; the word swaps at the midpoint of a flood. Placed worst level first; a label that would overlap a placed
    // one shows on tap instead, and the legend keeps every colour paired with its word (break-ui: 40 lots).
    const midpoint = tokenMs('--dn-dur-flood', 700) / 2;
    const placed: Box[] = [];
    const lotBoxes = new Map<string, Box>();
    for (const l of lots) {
      const b = (shapes.current.get(l.id)?.getElement() as SVGPathElement | undefined)?.getBoundingClientRect();
      if (b) lotBoxes.set(l.id, b);
    }
    const coversLot = (box: Box, ownId: string) => [...lotBoxes].some(([id, q]) => id !== ownId && overlaps(box, q));
    labelled.sort((x, y) => y.rank - x.rank);
    for (const { lot, poly, text, level, flooding } of labelled) {
      let label = labels.current.get(lot.id);
      if (!label) {
        label = makeLabel();
        labels.current.set(lot.id, label);
      }
      const { root, word } = label;
      // R-02: is-flooding gives the core its rise for this one change (set before the level so it transitions).
      if (flooding) {
        root.classList.add('is-flooding');
        window.setTimeout(() => root.classList.remove('is-flooding'), tokenMs('--dn-dur-flood', 700));
      } else root.classList.remove('is-flooding');
      setLabelLevel(root, level);
      if (flooding) {
        window.setTimeout(() => {
          if (alive()) word.textContent = text;
        }, midpoint);
      } else word.textContent = text;
      const bind = (permanent: boolean, direction: 'top' | 'bottom') => {
        poly.unbindTooltip();
        poly.bindTooltip(root, { permanent, direction, offset: [0, direction === 'top' ? -6 : 6], opacity: 1, className: 'dn-map-label' });
      };
      const tip = poly.getTooltip();
      const dir = (tip?.options.direction === 'bottom' ? 'bottom' : 'top') as 'top' | 'bottom';
      if (!tip || !tip.options.permanent) bind(true, dir);
      // T-070 / R-11: a label should not cover a neighbouring lot. Prefer above; go below when above covers a
      // neighbour and below does not. Lot overlap only picks the side; only label-on-label overlap hides a label.
      const own = (poly.getElement() as SVGPathElement | undefined)?.getBoundingClientRect();
      let r: Box | undefined = poly.getTooltip()?.getElement()?.getBoundingClientRect();
      if (r && own) {
        const h = r.bottom - r.top;
        const above: Box = dir === 'top' ? r : { left: r.left, right: r.right, bottom: own.top - 6, top: own.top - 6 - h };
        const below: Box = dir === 'bottom' ? r : { left: r.left, right: r.right, top: own.bottom + 6, bottom: own.bottom + 6 + h };
        const want = coversLot(above, lot.id) && !coversLot(below, lot.id) ? 'bottom' : 'top';
        if (want !== dir) {
          bind(true, want);
          r = poly.getTooltip()?.getElement()?.getBoundingClientRect();
        }
      }
      setTooltipLevel(poly.getTooltip()?.getElement(), level);
      if (r && placed.some((q) => overlaps(r!, q))) {
        bind(false, (poly.getTooltip()?.options.direction as 'top' | 'bottom' | undefined) ?? 'top');
        hidden = true;
      } else if (r) placed.push(r);
    }
    setHiddenLabels(hidden);
    // `playing`, `index` and `demo` decide only whether this change is a forward step; `day` drives the update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots, day, layer, prefs.units, prefs.language, t, unitById, zoom]);

  const sel = selected ? unitById(selected) : null;
  const source = sourceLabel(resolveProvenance(day?.provenance, demo?.manifest ?? null));

  if (status !== 'ready') return <LoadGate />;

  return (
    <div className="relative flex h-[calc(100dvh-64px-env(safe-area-inset-bottom,0px))] flex-col overscroll-none">
      <div className="z-[1001] mx-auto flex w-full max-w-3xl flex-col gap-2 bg-bg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
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
        <p className="m-0 text-footnote text-ink-3" title={source ?? undefined}>
          {date ? <span className="block">{t('common.dataFrom', { time: formatDate(date, prefs.units) })}</span> : null}
          {source ? <span className="block truncate">{t('common.source', { source })}</span> : null}
        </p>
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
      {/* CL-04: only the layer switch sits above the map; imagery choice and credit move onto it. */}
      <div className="relative min-h-0 flex-1">
        <div ref={box} className="absolute inset-0 z-0 text-ink" aria-label={t('map.title')} role="region" />
        <div className="absolute top-2.5 right-2.5 z-[1000]">
          <BaseSelect value={baseName} onChange={setBaseName} options={['satellite', 'streets', 'relief', 'truecolor']} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-3 z-[1001] mx-auto flex max-w-3xl flex-col items-start gap-1.5 px-3">
        <p className="m-0 max-w-full rounded-control bg-surface/90 px-2 py-0.5 text-caption text-ink-2">
          {t(creditKey(baseName), { layer: gibsLayerName(baseName) })}
        </p>
        {sel || selected ? (
          // CL-27 (1): the sheet enters from the bottom edge (spatial continuity); reduced motion keeps only the fade.
          <div className="w-full rounded-sheet bg-surface p-4 shadow-sheet transition-[translate,opacity] duration-sheet ease-drawer starting:translate-y-full starting:opacity-0 motion-reduce:transition-opacity motion-reduce:starting:translate-y-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="m-0 truncate text-headline text-ink">{unitName(selected ?? '')}</h2>
                <div className="mt-1">{sel ? <LevelBadge level={sel.alert.level} /> : null}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={t('common.close')}
                className="dn-press flex size-12 shrink-0 touch-manipulation select-none items-center justify-center rounded-full bg-surface-2 text-ink-2"
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
          <ReplayDock className="w-full" />
        )}
      </div>
    </div>
  );
}
