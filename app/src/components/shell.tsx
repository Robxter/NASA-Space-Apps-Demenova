// App-level pieces built from the designer's tokens and ui kit: level badge with dictionary words, segmented control,
// tab bar, screen header, status notices and the replay dock. Frontend-owned (outside components/ui).
import type { ReactNode } from 'react';
import { Button, EmptyState, ReplayScrubber, SeverityBadge, type SeverityBadgeProps } from './ui';
import { levelKey } from '../i18n';
import { highestLevel } from '../data/select';
import { href, type Route, type Tab } from '../state/nav';
import { useData } from '../state/data';
import { usePrefs } from '../state/prefs';
import { formatDayLong, formatDayShort, formatInstant } from '../time';

export function LevelBadge(props: Omit<SeverityBadgeProps, 'label' | 'lang'>) {
  const { prefs, t } = usePrefs();
  return <SeverityBadge {...props} lang={prefs.language} label={t(levelKey(props.level))} />;
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-control bg-surface-2 p-0.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`dn-press min-h-11 flex-1 touch-manipulation select-none rounded-control px-2 text-callout font-semibold ${
              on ? 'bg-surface text-ink shadow-banner' : 'text-ink-2'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const TAB_ICONS: Record<Tab, ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" />,
  map: <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4zm0 0v14m6-12v14" />,
  alerts: <path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v4L5 16h14l-1.5-3V9A5.5 5.5 0 0 0 12 3.5zM10 19a2 2 0 0 0 4 0" />,
  learn: <path d="M4 5.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4zm16 0h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6z" />,
};

export function TabBar({ current }: { current: Tab }) {
  const { t } = usePrefs();
  const tabs: Tab[] = ['home', 'map', 'alerts', 'learn'];
  return (
    <nav
      aria-label={t('tab.nav')}
      className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-surface pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
    >
      <ul className="m-0 mx-auto flex max-w-3xl list-none px-4 py-0">
        {tabs.map((tab) => {
          const on = tab === current;
          return (
            <li key={tab} className="flex-1">
              <a
                href={href({ name: tab })}
                aria-current={on ? 'page' : undefined}
                className={`flex min-h-14 touch-manipulation select-none flex-col items-center justify-center gap-0.5 text-caption font-semibold no-underline transition-opacity duration-[120ms] ease-standard [-webkit-touch-callout:none] active:opacity-60 ${
                  on ? 'text-leaf' : 'text-ink-3'
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
                  {TAB_ICONS[tab]}
                </svg>
                {t(`tab.${tab}`)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function ScreenHeader({
  title,
  back,
  trailing,
  children,
  titleClassName = '',
}: {
  title: string;
  back?: Route;
  trailing?: ReactNode;
  children?: ReactNode;
  /** Extra classes on the h1 (e.g. a view-transition-name for the lot header). */
  titleClassName?: string;
}) {
  const { t } = usePrefs();
  return (
    <header className="px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
      <div className="flex min-h-12 items-center justify-between gap-2">
        {back ? (
          <a href={href(back)} className="-ml-2 flex min-h-12 touch-manipulation select-none items-center px-2 text-body font-semibold text-leaf no-underline [-webkit-touch-callout:none] active:opacity-60">
            <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" className="mr-1.5">
              <path d="M7 1 1 7l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('common.back')}
          </a>
        ) : (
          <span />
        )}
        {trailing}
      </div>
      <h1 className={`m-0 text-title text-ink ${titleClassName}`}>{title}</h1>
      {children}
    </header>
  );
}

/** Offline, cached, fixture and missing-snapshot notices. Says where the data on screen comes from. */
export function StatusNotices() {
  const { demo, online } = useData();
  const { prefs, t } = usePrefs();
  const notes: string[] = [];
  if (demo?.source === 'fixture') notes.push(t('status.fixture'));
  if (!online || demo?.source === 'cache') {
    const when = formatInstant(demo?.cachedAt, prefs.units, prefs.language);
    notes.push(when ? t('status.offline', { time: when }) : t('status.offlineNoTime'));
  }
  if (!notes.length) return null;
  return (
    <div role="status" className="mx-4 mb-2 rounded-control border border-dashed border-line-strong px-3 py-2 text-footnote text-ink-2">
      {notes.map((n) => (
        <p key={n} className="m-0">
          {n}
        </p>
      ))}
    </div>
  );
}

/** The replay scrubber wired to the replay clock. The strip shows each day's highest level, or no data. */
export function ReplayDock({ className = '' }: { className?: string }) {
  const { demo, index, setIndex, playing, togglePlay, date, status } = useData();
  const { prefs } = usePrefs();
  if (!demo || status !== 'ready') return null;
  const days = demo.days.map((d) => ({ label: formatDayShort(d, prefs.language), level: highestLevel(demo.replay[d]) }));
  return (
    <ReplayScrubber
      className={className}
      days={days}
      index={index}
      dateLabel={date ? formatDayLong(date, prefs.language) : ''}
      onIndexChange={setIndex}
      playing={playing}
      onTogglePlay={togglePlay}
      demo={demo.farm?.farm.is_demo !== false}
      lang={prefs.language}
    />
  );
}

/** Loading, missing-snapshot and error states shared by every screen. */
export function LoadGate() {
  const { status, retry } = useData();
  const { t } = usePrefs();
  if (status === 'loading') return <EmptyState tone="empty" title={t('common.loading')} />;
  if (status === 'missing')
    return (
      <EmptyState
        tone="missing"
        title={t('status.noSnapshot')}
        body={t('status.noSnapshotBody')}
        action={<Button variant="secondary" onClick={retry}>{t('common.retry')}</Button>}
      />
    );
  return (
    <EmptyState
      tone="error"
      title={t('status.loadError')}
      body={t('status.loadErrorBody')}
      action={<Button variant="secondary" onClick={retry}>{t('common.retry')}</Button>}
    />
  );
}
