// Alerts (log of level changes from the replay files up to the current day), Learn and Strategies placeholders,
// and Settings (language, units, mode, storage, theme, device identity).
import { Button, Card, EmptyState, List, ListRow } from '../components/ui';
import { DataValue } from '../components/DataValue';
import { LevelBadge, LoadGate, ReplayDock, ScreenHeader, Segmented, StatusNotices } from '../components/shell';
import { fromSpec } from '../data/origin';
import { navigate } from '../state/nav';
import { useData } from '../state/data';
import { usePrefs } from '../state/prefs';
import { formatInstant } from '../time';
import { recordsCsv, savedDays } from '../data/records';
import { ConnectDevice } from '../components/ConnectDevice';
import type { AlertEvent } from '../types/contracts';

export function Alerts() {
  const { status, demo, date, unitName, lotById } = useData();
  const { prefs, t } = usePrefs();
  const hasLots = (demo?.farm?.lots.length ?? 0) > 0;
  const events: AlertEvent[] = [];
  if (demo && date) {
    for (const d of demo.days) {
      if (d > date) break;
      events.push(...(demo.replay[d]?.events ?? []).filter((e) => !hasLots || lotById(e.unit_id) !== null));
    }
  }
  events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <div className="pb-4">
      <ScreenHeader title={t('alerts.title')} />
      <StatusNotices />
      {status !== 'ready' ? (
        <LoadGate />
      ) : (
        <div className="flex flex-col gap-5 px-4">
          <Card title={t('alerts.log')} padded={false}>
            {events.length === 0 ? (
              <EmptyState title={t('alerts.empty')} body={t('alerts.emptyBody')} />
            ) : (
              <List>
                {events.map((e) => (
                  <ListRow
                    key={e.id}
                    leading={<LevelBadge level={e.to_level} variant="plain" size="sm" />}
                    title={unitName(e.unit_id)}
                    subtitle={
                      // Wraps instead of truncating: the time must never be cut off (break-ui: never truncate dates).
                      <>
                        <span className="block whitespace-normal">
                          {t('alerts.change', { from: t(`level.${e.from_level}`), to: t(`level.${e.to_level}`) })},{' '}
                          <span className="whitespace-nowrap tabular-nums">{formatInstant(e.at, prefs.units, prefs.language)}</span>
                        </span>
                        {e.factors.length ? (
                          <span className="block truncate" title={e.factors.map((f) => t(`factor.${f.name}`)).join(', ')}>
                            {e.factors.map((f) => t(`factor.${f.name}`)).join(', ')}
                          </span>
                        ) : null}
                      </>
                    }
                    trailing={<DataValue kind="index" si={e.w} origin={fromSpec(e.origin, 'w')} at={e.at} />}
                    onPress={() => navigate({ name: 'lot', id: e.unit_id })}
                  />
                ))}
              </List>
            )}
          </Card>
          <p className="m-0 px-4 text-footnote text-ink-3">{t('alerts.channels')}</p>
          <ReplayDock />
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const { prefs, set, t } = usePrefs();
  const { identity, demo, unitName, lotById } = useData();
  const exportCsv = () => {
    if (!demo) return;
    const hasLots = (demo.farm?.lots.length ?? 0) > 0;
    const csv = recordsCsv(demo.days, demo.replay, unitName, (id) => !hasLots || lotById(id) !== null);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `demenova-records-${demo.manifest.farm_id}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const identityText = {
    pending: t('status.identityPending'),
    'signed-in': t('status.signedIn'),
    'local-only': t('status.localOnly'),
    unconfigured: t('status.unconfigured'),
  }[identity.status];
  return (
    <div className="pb-4">
      <ScreenHeader title={t('settings.title')} back={{ name: 'home' }} />
      <div className="flex flex-col gap-5 px-4">
        <Card title={t('settings.farmSetup')}>
          <p className="m-0 mb-3 text-callout text-ink-2">{t('settings.farmSetupBody')}</p>
          <Button variant="secondary" block onClick={() => navigate({ name: 'setup' })}>
            {t('settings.farmSetup')}
          </Button>
        </Card>
        <Card title={t('settings.language')}>
          <Segmented label={t('settings.language')} value={prefs.language} onChange={(v) => set('language', v)} options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]} />
        </Card>
        <Card title={t('settings.units')}>
          <Segmented
            label={t('settings.units')}
            value={prefs.units}
            onChange={(v) => set('units', v)}
            options={[
              { value: 'metric', label: t('settings.units.metric') },
              { value: 'imperial', label: t('settings.units.imperial') },
            ]}
          />
        </Card>
        <Card title={t('settings.mode')}>
          <Segmented
            label={t('settings.mode')}
            value={prefs.mode}
            onChange={(v) => set('mode', v)}
            options={[
              { value: 'farmer', label: t('settings.mode.farmer') },
              { value: 'agronomist', label: t('settings.mode.agronomist') },
            ]}
          />
        </Card>
        <Card title={t('settings.storage')}>
          <Segmented
            label={t('settings.storage')}
            value={prefs.storage_mode}
            onChange={(v) => set('storage_mode', v)}
            options={[
              { value: 'full', label: t('settings.storage.full') },
              { value: 'saver', label: t('settings.storage.saver') },
            ]}
          />
        </Card>
        <Card title={t('settings.theme')}>
          <Segmented
            label={t('settings.theme')}
            value={prefs.theme}
            onChange={(v) => set('theme', v)}
            options={[
              { value: 'system', label: t('settings.theme.system') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
            ]}
          />
        </Card>
        <Card title={t('records.title')}>
          <p className="m-0 text-callout text-ink-2">{t('records.body')}</p>
          <p className="m-0 mt-2 text-callout text-ink">{t('records.saved', { n: demo ? savedDays(demo.replay) : 0 })}</p>
          <div className="mt-3">
            <Button variant="secondary" block onClick={exportCsv} disabled={!demo}>
              {t('records.export')}
            </Button>
          </div>
          <p className="m-0 mt-2 text-footnote text-ink-3">{t('records.note')}</p>
        </Card>
        <Card title={t('settings.identity')}>
          <p className="m-0 text-callout text-ink-2">{identityText}</p>
          <div className="mt-3">
            <ConnectDevice />
          </div>
        </Card>
        <p className="m-0 px-4 text-footnote text-ink-3">{t('app.credit')}</p>
      </div>
    </div>
  );
}
