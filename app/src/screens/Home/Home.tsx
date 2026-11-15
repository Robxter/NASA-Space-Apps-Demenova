// Home (SPEC 18): header with freshness and gear, alert banner (Warning or Severe only), status card, lots by W,
// replay control. Everything shown is engine output from the replay day; nothing is computed here.
import { AlertBanner, Card, DemoChip, EmptyState, List, ListRow } from '../../components/ui';
import { DataValue } from '../../components/DataValue';
import { LevelBadge, LoadGate, ReplayDock, ScreenHeader, StatusNotices } from '../../components/shell';
import { bannerUnit, countByLevel, highestW, newestUpdate, sortByW, topFactor } from '../../data/select';
import { fromSpec } from '../../data/origin';
import { resolveProvenance, sourceLabel } from '../../data/snapshots';
import { levelKey } from '../../i18n';
import { href, navigate } from '../../state/nav';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { formatInstant } from '../../time';
import { SEVERITY_VALUES, type ReplayUnit } from '../../types/contracts';

function GearLink() {
  const { t } = usePrefs();
  return (
    <a href={href({ name: 'settings' })} aria-label={t('home.settings')} className="flex size-12 items-center justify-center rounded-full text-ink-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    </a>
  );
}

export default function Home() {
  const { status, demo, day, unitName, date, lotUnits } = useData();
  const { prefs, t } = usePrefs();
  const farm = demo?.farm?.farm;
  const units = lotUnits;
  const updated = formatInstant(newestUpdate(units), prefs.units, prefs.language);
  const source = sourceLabel(resolveProvenance(day?.provenance, demo?.manifest ?? null));
  const banner = bannerUnit(units);
  const counts = countByLevel(units);
  const top = highestW(units);
  const reasonOf = (u: ReplayUnit) => {
    const f = topFactor(u.alert.factors);
    return f ? t('home.topFactor', { factor: t(`factor.${f.name}`) }) : t('home.noFactors');
  };
  const isAgronomist = prefs.mode === 'agronomist';

  return (
    <div className="pb-4">
      <ScreenHeader title={farm?.name ?? t('home.title')} trailing={<GearLink />}>
        <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-footnote text-ink-3">
          {farm?.is_demo ? <DemoChip lang={prefs.language} /> : null}
          <span>{updated ? t('common.updated', { time: updated }) : t('common.noData')}</span>
        </p>
      </ScreenHeader>
      <StatusNotices />

      {status !== 'ready' ? (
        <LoadGate />
      ) : (
        <div className="flex flex-col gap-5 px-4">
          {banner ? (
            <AlertBanner
              key={`${banner.unit_id}-${date}`}
              level={banner.alert.level}
              label={t(levelKey(banner.alert.level))}
              title={unitName(banner.unit_id)}
              reason={reasonOf(banner)}
              meta={formatInstant(banner.alert.updated_at, prefs.units, prefs.language) ?? undefined}
              lang={prefs.language}
              onset={banner.alert.level === 'severe'}
              onOpen={() => navigate({ name: 'lot', id: banner.unit_id })}
            />
          ) : null}

          <Card title={t('home.statusCard')} footer={source ? t('common.source', { source }) : undefined}>
            {units.length === 0 ? (
              <EmptyState tone="missing" title={t('common.noData')} />
            ) : (
              <div className="flex flex-col gap-4">
                <DataValue
                  kind="index"
                  si={top?.alert.w ?? null}
                  origin={top ? fromSpec(top.alert.origin, 'w') : null}
                  source={source}
                  at={top?.alert.updated_at}
                  label={t('home.highestW')}
                  size="display"
                />
                <div>
                  <p className="m-0 mb-2 text-footnote text-ink-2">{t('home.lotsPerLevel')}</p>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {SEVERITY_VALUES.filter((s) => s !== 'stale' || counts.stale > 0).map((s) => (
                      <li key={s} className="flex items-center gap-1.5">
                        <LevelBadge level={s} size="sm" />
                        {/* A count of units in the snapshot: a tally, not a measured value. */}
                        <span className="dn-num text-callout font-semibold text-ink">{counts[s]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>

          {banner === null && units.length > 0 && units.every((u) => u.alert.level === 'normal') ? (
            <EmptyState tone="empty" title={t('home.allNormal')} body={t('home.allNormalBody')} />
          ) : null}

          <Card title={t('home.lots')} padded={false}>
            {units.length === 0 ? (
              <EmptyState tone="missing" title={t('home.noUnits')} />
            ) : (
              <List>
                {sortByW(units).map((u) => (
                  <ListRow
                    key={u.unit_id}
                    leading={<LevelBadge level={u.alert.level} variant="plain" size="sm" />}
                    title={unitName(u.unit_id)}
                    subtitle={reasonOf(u)}
                    trailing={
                      isAgronomist ? (
                        <DataValue
                          kind="index"
                          si={u.alert.w}
                          origin={fromSpec(u.alert.origin, 'w')}
                          source={source}
                          at={u.alert.updated_at}
                        />
                      ) : undefined
                    }
                    onPress={() => navigate({ name: 'lot', id: u.unit_id })}
                  />
                ))}
              </List>
            )}
          </Card>

          <section aria-label={t('home.replay')}>
            <ReplayDock />
          </section>
        </div>
      )}
    </div>
  );
}
