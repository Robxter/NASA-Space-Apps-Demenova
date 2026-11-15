// Farm setup, data levels 0-2 (SPEC 18 Onboarding, SPEC "Data modes", D-028). Step 1 pin, step 2 outline (sourced
// terrain zones shown only where the engine computed them), step 3 lots by drawing, GeoJSON import or typing.
// Every change is saved on the device at once and synced to Supabase when the device has an identity.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, Card, EmptyState, List, ListRow } from '../../components/ui';
import { DataValue } from '../../components/DataValue';
import { ScreenHeader } from '../../components/shell';
import { ConnectDevice } from '../../components/ConnectDevice';
import {
  addLot,
  bboxesOverlap,
  bboxOf,
  CONFIDENCE_BY_LEVEL,
  newFarm,
  parseLotsGeoJson,
  polygonFrom,
  removeLot,
  setOutline,
  setPin,
  type LocalFarmRecord,
} from '../../data/farmSetup';
import { deleteLocalFarm, deleteRemoteFarm, loadLocalFarm, saveLocalFarm, syncFarm } from '../../data/farmStore';
import { getSupabase } from '../../data/identity';
import { loadZones } from '../../data/snapshots';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { useSnapshot } from '../../state/useSnapshot';
import { formatInstant } from '../../time';
import { convert, toSI } from '../../units';
import type { DataLevel, Point, Position, ZonesFile } from '../../types/contracts';

type Mode = 'idle' | 'pin' | 'outline' | 'lot';
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const ll = (p: Position): [number, number] => [p[1] ?? 0, p[0] ?? 0];

export function ConfidenceBadge({ level }: { level: DataLevel }) {
  const { t } = usePrefs();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-footnote font-semibold text-ink">
      {t('setup.level', { n: level })} · {t('setup.confidence', { level: t(`confidence.${CONFIDENCE_BY_LEVEL[level]}`) })}
    </span>
  );
}

function SetupMap({
  rec,
  mode,
  draft,
  zones,
  center,
  onTap,
}: {
  rec: LocalFarmRecord | null;
  mode: Mode;
  draft: Position[];
  zones: ZonesFile | null;
  center: [number, number] | null;
  onTap: (p: Position) => void;
}) {
  const { t } = usePrefs();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const tap = useRef(onTap);
  tap.current = onTap;
  const fitted = useRef(false);

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { maxZoom: 18, attributionControl: false });
    L.tileLayer(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/ASTER_GDEM_Greyscale_Shaded_Relief/default/GoogleMapsCompatible_Level12/{z}/{y}/{x}.jpg',
      { maxNativeZoom: 12, maxZoom: 18, crossOrigin: true },
    ).addTo(m);
    m.setView(center ?? [0, -79], center ? 14 : 3);
    m.on('click', (e: L.LeafletMouseEvent) => tap.current([Number(e.latlng.lng.toFixed(6)), Number(e.latlng.lat.toFixed(6))]));
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // The map is created once; `center` only sets the first view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const style = { color: 'currentColor', weight: 2, fillColor: 'currentColor', fillOpacity: 0.08 };
    if (zones && rec?.farm.outline) {
      for (const f of zones.features) {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
        for (const p of polys)
          L.polygon(p.map((r) => r.map(ll)), { ...style, dashArray: '2 4', fillOpacity: 0.04 * (f.properties.tercile === 'high' ? 4 : f.properties.tercile === 'mid' ? 2 : 1) })
            .bindTooltip(t(`zone.${f.properties.tercile}`))
            .addTo(g);
      }
    }
    if (rec?.farm.outline) L.polygon(rec.farm.outline.coordinates.map((r) => r.map(ll)), { ...style, dashArray: '6 4', fillOpacity: 0 }).addTo(g);
    for (const lot of rec?.lots ?? []) {
      if (lot.geometry) L.polygon(lot.geometry.coordinates.map((r) => r.map(ll)), style).bindTooltip(lot.name, { permanent: true, direction: 'center' }).addTo(g);
    }
    if (rec && mode !== 'pin') L.circleMarker(ll(rec.farm.location.coordinates), { radius: 7, color: 'currentColor', weight: 3, fillOpacity: 1 }).addTo(g);
    if (draft.length) {
      if (mode === 'pin') L.circleMarker(ll(draft[0] as Position), { radius: 8, color: 'currentColor', weight: 3, fillOpacity: 1 }).addTo(g);
      else {
        L.polyline(draft.map(ll), { color: 'currentColor', weight: 3, dashArray: '4 4' }).addTo(g);
        draft.forEach((p) => L.circleMarker(ll(p), { radius: 5, color: 'currentColor', fillOpacity: 1 }).addTo(g));
      }
    }
    if (!fitted.current && rec) {
      const b = bboxOf([rec.farm.location.coordinates, rec.farm.outline?.coordinates ?? [], rec.lots.map((l) => l.geometry?.coordinates ?? [])]);
      if (b) m.fitBounds([[b[1], b[0]], [b[3], b[2]]], { maxZoom: 16, padding: [24, 24] });
      fitted.current = true;
    }
  }, [rec, mode, draft, zones, t]);

  return (
    <div
      ref={box}
      role="application"
      aria-label={t('setup.mapLabel')}
      className={`relative z-0 h-72 overflow-hidden overscroll-none rounded-group text-ink ${mode === 'idle' ? '' : 'cursor-crosshair'}`}
    />
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  const { t } = usePrefs();
  return (
    <Card title={`${n}. ${title}`} action={done ? <span className="text-footnote font-semibold text-leaf">{t('setup.done')}</span> : undefined}>
      <div className="flex flex-col gap-3">{children}</div>
    </Card>
  );
}

const field = 'min-h-12 w-full rounded-control border border-line-strong bg-surface px-3 text-body text-ink';

export default function Setup() {
  const { prefs, t } = usePrefs();
  const { identity, demo } = useData();
  const [rec, setRec] = useState<LocalFarmRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [draft, setDraft] = useState<Position[]>([]);
  const [draftOrigin, setDraftOrigin] = useState<'provided' | 'observed'>('provided');
  const [name, setName] = useState('');
  const [lotName, setLotName] = useState('');
  const [lotArea, setLotArea] = useState('');
  const [lotAge, setLotAge] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const zonesFile = useSnapshot(() => loadZones());
  const zones = zonesFile.status === 'ready' ? zonesFile.value.data : null;
  const areaUnit = convert('ha', 0, prefs.units).unit;

  useEffect(() => {
    void loadLocalFarm().then((r) => {
      setRec(r);
      setName(r?.farm.name ?? '');
      setLoaded(true);
    });
  }, []);

  const sync = useCallback(
    async (r: LocalFarmRecord) => {
      if (identity.status !== 'signed-in') return;
      setSyncing(true);
      const out = await syncFarm(r, await getSupabase(), identity.userId);
      setSyncing(false);
      if (out.status === 'local') return;
      const next = out.status === 'synced' ? { ...r, synced_at: out.at, sync_error: null } : { ...r, sync_error: out.message };
      setRec(next);
      await saveLocalFarm(next);
    },
    [identity],
  );

  // Records by default: every change is written to the device before anything else happens.
  const commit = useCallback(
    async (next: LocalFarmRecord) => {
      setRec(next);
      await saveLocalFarm(next);
      void sync(next);
    },
    [sync],
  );

  useEffect(() => {
    if (rec && !rec.synced_at && !rec.sync_error && identity.status === 'signed-in') void sync(rec);
    // Retry once when an identity arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.status]);

  const center = useMemo<[number, number] | null>(() => {
    const p = rec?.farm.location.coordinates ?? demo?.farm?.farm.location.coordinates;
    return p ? ll(p) : null;
  }, [rec, demo]);

  const zonesHere = !!rec?.farm.outline && !!zones && bboxesOverlap(bboxOf(rec.farm.outline.coordinates), bboxOf(zones.features.map((f) => f.geometry.coordinates)));

  const start = (m: Mode) => {
    setMode(m);
    setDraft([]);
    setDraftOrigin('provided');
    setMessage(null);
  };
  const onTap = (p: Position) => {
    if (mode === 'pin') setDraft([p]);
    else if (mode === 'outline' || mode === 'lot') setDraft((d) => [...d, p]);
  };

  const useGps = () => {
    if (!('geolocation' in navigator)) return setMessage(t('setup.gpsUnavailable'));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMode('pin');
        setDraft([[Number(pos.coords.longitude.toFixed(6)), Number(pos.coords.latitude.toFixed(6))]]);
        setDraftOrigin('observed');
      },
      () => setMessage(t('setup.gpsUnavailable')),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const savePin = async () => {
    const p = draft[0];
    if (!p) return;
    const point: Point = { type: 'Point', coordinates: p };
    if (rec) await commit(setPin(rec, point, draftOrigin, nowIso()));
    else {
      if (!name.trim()) return setMessage(t('setup.nameNeeded'));
      await commit(newFarm({ name, location: point, locationOrigin: draftOrigin, prefs, ownerId: identity.userId, now: nowIso() }));
    }
    start('idle');
  };

  const finishShape = async () => {
    if (!rec) return;
    const poly = polygonFrom(draft);
    if (!poly) return setMessage(t('setup.needThree'));
    if (mode === 'outline') await commit(setOutline(rec, poly, nowIso()));
    else await commit(addLot(rec, { name: lotName, geometry: poly, ...typedNumbers() }, nowIso()));
    setLotName('');
    setLotArea('');
    setLotAge('');
    start('idle');
  };

  const typedNumbers = () => {
    const area = lotArea.trim() === '' ? null : Number(lotArea.replace(',', '.'));
    const age = lotAge.trim() === '' ? null : Number(lotAge.replace(',', '.'));
    return {
      area_ha: area === null || !Number.isFinite(area) ? null : toSI('ha', area, prefs.units),
      plant_age_months: age === null || !Number.isFinite(age) ? null : age,
    };
  };

  const addTyped = async () => {
    if (!rec) return;
    if (!lotName.trim()) return setMessage(t('setup.nameNeeded'));
    await commit(addLot(rec, { name: lotName, geometry: null, ...typedNumbers() }, nowIso()));
    setLotName('');
    setLotArea('');
    setLotAge('');
    setMessage(t('setup.typedSaved'));
  };

  const importFile = async (file: File | undefined) => {
    if (!rec || !file) return;
    if (file.size > 2_000_000) return setMessage(t('setup.importTooBig'));
    const res = parseLotsGeoJson(await file.text());
    if (res.error) return setMessage(t(res.error === 'not_json' ? 'setup.importNotJson' : 'setup.importNotGeojson'));
    let next = rec;
    for (const l of res.lots) next = addLot(next, { name: l.name, geometry: l.geometry, area_ha: null, plant_age_months: null }, nowIso());
    await commit(next);
    setMessage(t('setup.imported', { n: res.lots.length, skipped: res.skipped.length }));
  };

  const reset = async () => {
    if (!rec || !window.confirm(t('setup.resetConfirm'))) return;
    const err = identity.status === 'signed-in' && rec.synced_at ? await deleteRemoteFarm(rec.farm.id, await getSupabase()) : null;
    await deleteLocalFarm();
    setRec(null);
    setName('');
    start('idle');
    setMessage(err ? t('setup.resetRemoteFailed') : t('setup.resetDone'));
  };

  const syncLine = (() => {
    if (!rec) return null;
    if (syncing) return t('setup.syncing');
    if (rec.sync_error) return t('setup.syncFailed');
    if (rec.synced_at) return t('setup.synced', { time: formatInstant(rec.synced_at, prefs.units, prefs.language) ?? '' });
    return identity.status === 'signed-in' ? t('setup.syncPending') : t('setup.deviceOnly');
  })();

  const drawing = mode !== 'idle';
  const drawBar = drawing ? (
    <div className="flex flex-wrap gap-2">
      <p className="m-0 w-full text-callout text-ink-2">{t(mode === 'pin' ? 'setup.tapPin' : 'setup.tapShape', { n: draft.length })}</p>
      {mode === 'pin' ? (
        <Button onClick={savePin} disabled={!draft.length}>
          {t('setup.savePin')}
        </Button>
      ) : (
        <>
          <Button onClick={finishShape} disabled={draft.length < 3}>
            {t('setup.finish')}
          </Button>
          <Button variant="secondary" onClick={() => setDraft((d) => d.slice(0, -1))} disabled={!draft.length}>
            {t('setup.undo')}
          </Button>
        </>
      )}
      <Button variant="quiet" onClick={() => start('idle')}>
        {t('setup.cancel')}
      </Button>
    </div>
  ) : null;

  if (!loaded) return <EmptyState title={t('common.loading')} />;

  return (
    <div className="pb-6">
      <ScreenHeader title={t('setup.title')} back={{ name: 'settings' }}>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {rec ? <ConfidenceBadge level={rec.farm.data_level} /> : <ConfidenceBadge level={0} />}
          {syncLine ? <span className="text-footnote text-ink-3">{syncLine}</span> : null}
          {rec?.sync_error && identity.status === 'signed-in' && !syncing ? (
            <button
              type="button"
              onClick={() => void sync(rec)}
              className="min-h-11 touch-manipulation select-none rounded-control px-2 text-footnote font-semibold text-leaf active:opacity-60"
            >
              {t('setup.syncRetry')}
            </button>
          ) : null}
        </div>
      </ScreenHeader>

      <div className="flex flex-col gap-5 px-4">
        <p className="m-0 text-callout text-ink-2">{t('setup.intro')}</p>
        {message ? (
          <p role="status" className="m-0 rounded-control border border-dashed border-line-strong px-3 py-2 text-callout text-ink">
            {message}
          </p>
        ) : null}

        <SetupMap rec={rec} mode={mode} draft={draft} zones={zonesHere ? zones : null} center={center} onTap={onTap} />
        {drawBar}

        <Step n={1} title={t('setup.step.pin')} done={!!rec}>
          {!rec ? (
            <label className="flex flex-col gap-1 text-footnote font-semibold text-ink-2">
              {t('setup.farmName')}
              <input className={field} value={name} onChange={(e) => setName(e.currentTarget.value)} autoComplete="off" autoCapitalize="words" enterKeyHint="done" maxLength={80} />
            </label>
          ) : (
            <p className="m-0 text-body text-ink">{rec.farm.name}</p>
          )}
          {!drawing ? (
            <div className="flex flex-wrap gap-2">
              <Button variant={rec ? 'secondary' : 'primary'} onClick={() => start('pin')}>
                {rec ? t('setup.movePin') : t('setup.dropPin')}
              </Button>
              <Button variant="secondary" onClick={useGps}>
                {t('setup.useGps')}
              </Button>
            </div>
          ) : null}
        </Step>

        {rec ? (
          <Step n={2} title={t('setup.step.outline')} done={!!rec.farm.outline}>
            <p className="m-0 text-callout text-ink-2">{t('setup.outlineHelp')}</p>
            {rec.farm.outline ? (
              <p className="m-0 text-callout text-ink">{zonesHere ? t('setup.zonesShown') : t('setup.zonesPending')}</p>
            ) : null}
            {!drawing ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => start('outline')}>
                  {rec.farm.outline ? t('setup.redrawOutline') : t('setup.drawOutline')}
                </Button>
                {rec.farm.outline ? (
                  <Button variant="quiet" onClick={() => void commit(setOutline(rec, null, nowIso()))}>
                    {t('setup.removeOutline')}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Step>
        ) : null}

        {rec ? (
          <Step n={3} title={t('setup.step.lots')} done={rec.lots.length > 0}>
            <p className="m-0 text-callout text-ink-2">{t('setup.lotsHelp')}</p>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex flex-col gap-1 text-footnote font-semibold text-ink-2">
                {t('setup.lotName')}
                <input className={field} value={lotName} onChange={(e) => setLotName(e.currentTarget.value)} autoComplete="off" autoCapitalize="sentences" enterKeyHint="next" maxLength={60} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-footnote font-semibold text-ink-2">
                  {t('setup.lotArea', { unit: areaUnit })}
                  <input className={field} inputMode="decimal" enterKeyHint="next" autoComplete="off" value={lotArea} onChange={(e) => setLotArea(e.currentTarget.value)} />
                </label>
                <label className="flex flex-col gap-1 text-footnote font-semibold text-ink-2">
                  {t('setup.lotAge')}
                  <input className={field} inputMode="numeric" enterKeyHint="done" autoComplete="off" value={lotAge} onChange={(e) => setLotAge(e.currentTarget.value)} />
                </label>
              </div>
            </div>
            {!drawing ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => start('lot')}>
                  {t('setup.drawLot')}
                </Button>
                <Button variant="secondary" onClick={addTyped}>
                  {t('setup.typeLot')}
                </Button>
                <label className="inline-flex min-h-12 cursor-pointer touch-manipulation select-none items-center justify-center rounded-control bg-surface-2 px-5 text-body font-semibold text-ink transition-transform duration-[120ms] ease-standard focus-within:outline focus-within:outline-3 focus-within:outline-focus active:scale-[0.98]">
                  {t('setup.importLots')}
                  <input
                    type="file"
                    accept=".geojson,.json,application/geo+json,application/json"
                    className="sr-only"
                    onChange={(e) => {
                      void importFile(e.currentTarget.files?.[0]);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            ) : null}
            {rec.lots.length ? (
              <div className="-mx-4">
                <List label={t('setup.step.lots')}>
                  {rec.lots.map((l) => (
                    <ListRow
                      key={l.id}
                      title={l.name}
                      subtitle={l.geometry ? t('setup.lotDrawn') : t('setup.lotNoShape')}
                      trailing={
                        <span className="flex items-center gap-2">
                          <DataValue kind="ha" si={l.area_ha} origin={l.area_ha_origin} at={rec.farm.updated_at} source={t('setup.sourceYou')} />
                          <button
                            type="button"
                            onClick={() => void commit(removeLot(rec, l.id, nowIso()))}
                            className="min-h-11 touch-manipulation select-none rounded-control px-2 text-callout font-semibold text-leaf active:opacity-60"
                            aria-label={t('setup.removeLotNamed', { name: l.name })}
                          >
                            {t('setup.remove')}
                          </button>
                        </span>
                      }
                    />
                  ))}
                </List>
              </div>
            ) : null}
          </Step>
        ) : null}

        {rec && identity.status !== 'signed-in' ? (
          <Card title={t('setup.connectTitle')}>
            <p className="m-0 mb-3 text-callout text-ink-2">{t('status.localOnly')}</p>
            <ConnectDevice />
          </Card>
        ) : null}

        {rec ? (
          <Card title={t('setup.yourData')}>
            <p className="m-0 text-callout text-ink-2">{t('setup.alertsLater')}</p>
            <div className="mt-3">
              <Button variant="quiet" onClick={reset}>
                {t('setup.reset')}
              </Button>
            </div>
          </Card>
        ) : null}
        <p className="m-0 px-4 text-footnote text-ink-3">{t('setup.privacy')}</p>
      </div>
    </div>
  );
}
