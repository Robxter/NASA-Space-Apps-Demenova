// Lot detail (SPEC 18): level and W, why (factors with share and timestamps), today's features, history charts
// (1W / 1M / 3M, lazy uPlot), lot facts, strategies button. Displays engine output only.
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, List, ListRow, MissingData } from '../../components/ui';
import { DataValue, OriginBadge } from '../../components/DataValue';
import { LevelBadge, LoadGate, ScreenHeader, Segmented, StatusNotices } from '../../components/shell';
import { LevelCheck } from '../../components/LevelCheck';
import { loadDevFixtureHistory, loadHistory } from '../../data/demo';
import { fromSpec, resolveOrigin } from '../../data/origin';
import { provenanceByIds, resolveProvenance, sourceLabel } from '../../data/snapshots';
import { navigate } from '../../state/nav';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { formatDate, formatInstant } from '../../time';
import type { DailyFeature, FactorName, HistoryFile, HistorySeries, Origin } from '../../types/contracts';
import type { QuantityKind } from '../../units';

const HistoryChart = lazy(() => import('./HistoryChart'));
const ReliabilitySheet = lazy(() => import('./ReliabilitySheet'));

type Range = '1w' | '1m' | '3m';
const RANGE_DAYS: Record<Range, number> = { '1w': 7, '1m': 30, '3m': 90 };

type HistState = { status: 'loading' } | { status: 'ready'; file: HistoryFile } | { status: 'missing' };

function useHistory(unitId: string): HistState {
  const { prefs } = usePrefs();
  const [state, setState] = useState<HistState>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    loadHistory(unitId, { storageMode: prefs.storage_mode })
      .then((r) => alive && setState({ status: 'ready', file: r.data }))
      .catch(async () => {
        const f = await loadDevFixtureHistory(unitId);
        if (alive) setState(f ? { status: 'ready', file: f } : { status: 'missing' });
      });
    return () => {
      alive = false;
    };
  }, [unitId, prefs.storage_mode]);
  return state;
}

type ChartField = 'rain_local_mm' | 'soil_moisture' | 'temp_mean_c' | 'ndvi';
const CHARTS: { field: ChartField; kind: QuantityKind; label: 'lot.chart.rain' | 'lot.chart.soil' | 'lot.chart.temp' | 'lot.chart.ndvi' }[] = [
  { field: 'rain_local_mm', kind: 'mm', label: 'lot.chart.rain' },
  { field: 'soil_moisture', kind: 'fraction', label: 'lot.chart.soil' },
  { field: 'temp_mean_c', kind: 'celsius', label: 'lot.chart.temp' },
  { field: 'ndvi', kind: 'index', label: 'lot.chart.ndvi' },
];

function seriesOrigins(series: HistorySeries, field: ChartField, from: number): Origin[] {
  if (field === 'soil_moisture' && Array.isArray(series.soil_moisture_origin)) {
    const set = new Set(series.soil_moisture_origin.slice(from).filter((o): o is Origin => o !== null));
    if (set.size) return [...set];
  }
  const o = fromSpec(series.origin, field);
  return o ? [o] : [];
}

function History({ unitId, date }: { unitId: string; date: string | null }) {
  const { prefs, t } = usePrefs();
  const { demo } = useData();
  const hist = useHistory(unitId);
  const [range, setRange] = useState<Range>('1m');

  const view = useMemo(() => {
    if (hist.status !== 'ready') return null;
    const { dates, series } = hist.file;
    const end = date ? dates.filter((d) => d <= date).length : dates.length;
    const from = Math.max(0, end - RANGE_DAYS[range]);
    return { dates: dates.slice(from, end), series, from, end };
  }, [hist, date, range]);

  if (hist.status === 'loading') return <EmptyState title={t('common.loading')} />;
  if (hist.status === 'missing' || !view) return <EmptyState tone="missing" title={t('lot.noHistory')} body={t('lot.noHistoryBody')} />;
  const source = sourceLabel(resolveProvenance(hist.file.provenance, demo?.manifest ?? null));

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label={t('lot.history')}
        value={range}
        onChange={setRange}
        options={(['1w', '1m', '3m'] as Range[]).map((r) => ({ value: r, label: t(`lot.range.${r}`) }))}
      />
      {CHARTS.map((c) => {
        const values = (view.series[c.field] as (number | null)[]).slice(view.from, view.end);
        const hasAny = values.some((v) => v !== null);
        const origins = seriesOrigins(view.series, c.field, view.from);
        return (
          <div key={c.field}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="m-0 text-callout font-semibold text-ink">{t(c.label)}</h3>
              <span className="flex gap-1">
                {hasAny ? origins.map((o) => <OriginBadge key={o} origin={o} />) : null}
              </span>
            </div>
            {hasAny && origins.length ? (
              <Suspense fallback={<div className="h-[140px] rounded-control bg-skeleton" />}>
                <HistoryChart dates={view.dates} values={values} kind={c.kind} units={prefs.units} label={t(c.label)} marker={date} />
              </Suspense>
            ) : (
              <MissingData lang={prefs.language} variant="block" />
            )}
          </div>
        );
      })}
      <p className="m-0 text-footnote text-ink-3">{t('lot.priorYears')}</p>
      <p className="m-0 text-footnote text-ink-3">
        {[
          source ? t('common.source', { source }) : null,
          t('common.updated', { time: formatInstant(hist.file.generated_at, prefs.units, prefs.language) ?? '' }),
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
    </div>
  );
}

const TODAY: { key: keyof DailyFeature; kind: QuantityKind; label: 'lot.rainLocal' | 'lot.rainUp24' | 'lot.soilMoisture' | 'lot.balance7d' }[] = [
  { key: 'rain_local_mm', kind: 'mm', label: 'lot.rainLocal' },
  { key: 'rain_upstream_24h_mm', kind: 'mm', label: 'lot.rainUp24' },
  { key: 'soil_moisture', kind: 'fraction', label: 'lot.soilMoisture' },
  { key: 'balance_7d_mm', kind: 'mm', label: 'lot.balance7d' },
];

export default function Lot({ id }: { id: string }) {
  const { status, demo, day, date, lotById, unitById, unitName } = useData();
  const { prefs, t } = usePrefs();
  const lot = lotById(id);
  const unit = unitById(id);
  const manifest = demo?.manifest ?? null;
  const daySource = sourceLabel(resolveProvenance(day?.provenance, manifest));
  const featSource = unit?.features ? sourceLabel(provenanceByIds(unit.features.provenance_ids, manifest)) : null;
  const farmUpdated = demo?.farm?.farm.updated_at ?? null;
  const farmSource = sourceLabel(resolveProvenance(demo?.farm?.provenance, manifest));
  const isAgronomist = prefs.mode === 'agronomist';
  const when = (iso: string | null | undefined) => formatInstant(iso, prefs.units, prefs.language);
  const [reliabilityOpen, setReliabilityOpen] = useState(false);

  if (status !== 'ready') {
    return (
      <div>
        <ScreenHeader title={t('common.loading')} back={{ name: 'home' }} />
        <LoadGate />
      </div>
    );
  }
  if (!lot && !unit) {
    return (
      <div>
        <ScreenHeader title={id} back={{ name: 'home' }} />
        <EmptyState tone="missing" title={t('lot.notFound')} />
      </div>
    );
  }

  const alert = unit?.alert;
  const wOrigin = alert ? fromSpec(alert.origin, 'w') : null;

  return (
    <div className="pb-6">
      <ScreenHeader title={unitName(id)} back={{ name: 'home' }}>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {alert ? <LevelBadge level={alert.level} onset={alert.level === 'severe'} /> : <MissingData lang={prefs.language} />}
          {alert ? <span className="text-footnote text-ink-3">{t('lot.confidence', { n: alert.confidence })}</span> : null}
        </div>
      </ScreenHeader>
      <StatusNotices />

      <div className="flex flex-col gap-5 px-4">
        <Card footer={daySource ? t('common.source', { source: daySource }) : undefined}>
          <DataValue kind="index" si={alert?.w ?? null} origin={wOrigin} source={daySource} at={alert?.updated_at} label={t('w.label')} size="display" showMeta={isAgronomist} />
          {alert && alert.w !== null ? (
            <div data-level={alert.level} aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-lvl-fill" style={{ width: `${Math.min(Math.max(alert.w, 0), 1) * 100}%` }} />
            </div>
          ) : null}
          {alert ? (
            <p className="m-0 mt-3 text-footnote text-ink-3">
              {t('lot.since', { time: when(alert.since) ?? '' })}
              {' · '}
              {alert.newest_rain_data_at ? t('lot.rainDataAt', { time: when(alert.newest_rain_data_at) ?? '' }) : t('common.noData')}
            </p>
          ) : null}
        </Card>

        <LevelCheck level={alert?.level} />

        <Button variant="secondary" block onClick={() => setReliabilityOpen(true)}>
          {t('reliability.open')}
        </Button>
        {reliabilityOpen ? (
          <Suspense fallback={null}>
            <ReliabilitySheet onClose={() => setReliabilityOpen(false)} />
          </Suspense>
        ) : null}

        <Card title={t('lot.why')} padded={false}>
          {alert && alert.factors.length ? (
            <List>
              {[...alert.factors]
                .sort((a, b) => b.share - a.share)
                .map((f) => (
                  <ListRow
                    key={f.name}
                    title={t(`factor.${f.name as FactorName}`)}
                    subtitle={t('lot.share')}
                    trailing={<DataValue kind="fraction" si={f.share} origin={fromSpec(alert.origin, 'factors')} source={daySource} at={alert.updated_at} />}
                  />
                ))}
            </List>
          ) : (
            <EmptyState tone="missing" title={t('home.noFactors')} />
          )}
        </Card>

        {isAgronomist ? (
          <Card title={`${t('lot.today')}${date ? `, ${formatDate(date, prefs.units)}` : ''}`}>
            <div className="grid grid-cols-2 gap-4">
              {TODAY.map((f) => (
                <DataValue
                  key={f.key}
                  kind={f.kind}
                  si={unit?.features ? (unit.features[f.key] as number | null) : null}
                  origin={resolveOrigin(unit?.features, f.key)}
                  source={featSource}
                  at={alert?.updated_at}
                  label={t(f.label)}
                />
              ))}
            </div>
          </Card>
        ) : null}

        {/* Cold stress was removed (D-024); Sigatoka is experimental and labelled so. */}
        {isAgronomist && alert?.side.sigatoka ? (
          <Card title={t('lot.side')}>
            <span className="flex flex-wrap items-center gap-2 text-callout text-ink">
              {t('lot.sigatoka')} <LevelBadge level={alert.side.sigatoka} size="sm" />
              <span className="rounded-full border border-dashed border-line-strong px-1.5 text-caption text-ink-2">{t('common.experimental')}</span>
            </span>
          </Card>
        ) : null}

        <Card title={t('lot.history')}>
          <History unitId={id} date={date} />
        </Card>

        {lot ? (
          <Card title={t('lot.facts')} padded={false} footer={farmSource ? t('common.source', { source: farmSource }) : undefined}>
            <List>
              <ListRow title={t('lot.area')} trailing={<DataValue kind="ha" si={lot.area_ha} origin={resolveOrigin(lot, 'area_ha')} source={farmSource} at={farmUpdated} />} />
              <ListRow
                title={t('lot.age')}
                trailing={<DataValue kind="months" si={lot.plant_age_months} origin={resolveOrigin(lot, 'plant_age_months')} source={farmSource} at={farmUpdated} />}
                subtitle={t('lot.months')}
              />
              <ListRow
                title={t('lot.drainage')}
                trailing={<Category text={lot.drainage_class ? t(`drainage.${lot.drainage_class}`) : null} origin={resolveOrigin(lot, 'drainage_class')} />}
              />
              <ListRow
                title={t('lot.drainageWorks')}
                trailing={<Category text={lot.drainage_works ? t(`works.${lot.drainage_works}`) : null} origin={resolveOrigin(lot, 'drainage_works')} />}
              />
              <ListRow
                title={t('lot.cover')}
                trailing={<Category text={lot.cover_crop ? t(`cover.${lot.cover_crop}`) : null} origin={resolveOrigin(lot, 'cover_crop')} />}
              />
              <ListRow
                title={t('lot.soilAnalysis')}
                subtitle={lot.last_soil_analysis?.date ? formatDate(lot.last_soil_analysis.date, prefs.units) : undefined}
                trailing={
                  lot.last_soil_analysis ? (
                    <span className="flex flex-col items-end gap-1">
                      <DataValue kind="index" decimals={1} si={lot.last_soil_analysis.ph} origin={resolveOrigin(lot, 'last_soil_analysis')} source={farmSource} at={farmUpdated} label={t('lot.ph')} />
                      <DataValue kind="fraction" decimals={1} si={lot.last_soil_analysis.organic_matter_pct} origin={resolveOrigin(lot, 'last_soil_analysis')} source={farmSource} at={farmUpdated} label={t('lot.om')} />
                    </span>
                  ) : (
                    <MissingData lang={prefs.language} />
                  )
                }
              />
            </List>
          </Card>
        ) : null}

        <Button block onClick={() => navigate({ name: 'strategies', id })}>
          {t('lot.strategies')}
        </Button>
      </div>
    </div>
  );
}

function Category({ text, origin }: { text: string | null; origin: Origin | null }) {
  const { prefs } = usePrefs();
  if (text === null) return <MissingData lang={prefs.language} />;
  return (
    <span className="flex items-center gap-1.5 text-callout text-ink">
      {text}
      <OriginBadge origin={origin} />
    </span>
  );
}
