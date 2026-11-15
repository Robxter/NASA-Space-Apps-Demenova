// The one way the app renders a number (Rule zero): the designer's <Value> plus the value's origin badge and a
// source/timestamp tooltip. A value whose origin is unknown is not shown; it renders as missing with the reason.
// Frontend wrapper outside components/ui: product-designer may fold the origin badge into Value later (HANDOFF).
import { DemoChip, Value } from './ui';
import type { Origin } from '../types/contracts';
import { displayQuantity, type QuantityKind } from '../units';
import { formatInstant } from '../time';
import { usePrefs } from '../state/prefs';

export interface DataValueProps {
  kind: QuantityKind;
  /** SI value as stored; null or undefined is missing. */
  si: number | null | undefined;
  origin: Origin | null;
  /** Dataset or record the value comes from. */
  source?: string | null;
  /** UTC timestamp the value refers to or was produced at. */
  at?: string | null;
  label?: string;
  /** Accessible name when the visible label sits outside, e.g. in a list row title: it leads the tooltip and the
   *  screen-reader text, so the value still announces what it measures. */
  name?: string;
  size?: 'display' | 'title' | 'body';
  decimals?: number;
  /** Shows source and time as a visible line under the value (agronomist detail). */
  showMeta?: boolean;
  missingReason?: string;
  /** Hide the origin badge when the surrounding group already shows the same origin. */
  hideBadge?: boolean;
  /** Badge under the value, right-aligned: a narrow trailing column in list rows (CL-02). */
  stacked?: boolean;
  className?: string;
}

export function OriginBadge({ origin }: { origin: Origin | null }) {
  const { prefs, t } = usePrefs();
  if (origin === 'synthetic') return <DemoChip lang={prefs.language} />;
  const word = origin ? t(`origin.${origin}`) : t('origin.unknown');
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-line-strong px-1.5 text-caption text-ink-2">
      {word}
    </span>
  );
}

export function DataValue({
  kind,
  si,
  origin,
  source,
  at,
  label,
  name,
  size = 'body',
  decimals,
  showMeta = false,
  missingReason,
  hideBadge = false,
  stacked = false,
  className = '',
}: DataValueProps) {
  const { prefs, t } = usePrefs();
  const q = displayQuantity(kind, si, prefs.units, prefs.language, decimals);
  const unknownOrigin = q.text !== null && origin === null;
  const when = formatInstant(at, prefs.units, prefs.language);
  const metaParts = [source ? t('common.source', { source }) : null, when ? t('common.updated', { time: when }) : null].filter(
    (x): x is string => Boolean(x),
  );
  // Full stops in tooltips and meta (copy-proposals "Separators"); QA's origin check reads the words, not the dots.
  const tooltip = [name, origin ? t(`origin.${origin}`) : t('origin.unknown'), ...metaParts].filter(Boolean).join('. ');
  return (
    <span className={`inline-flex ${stacked ? 'flex-col items-end gap-0.5' : 'items-end gap-1.5'} ${className}`} title={tooltip}>
      <Value
        value={unknownOrigin ? null : q.text}
        unit={q.unit || undefined}
        label={label}
        size={size}
        lang={prefs.language}
        meta={showMeta && metaParts.length ? metaParts.join('. ') : undefined}
        missingReason={unknownOrigin ? t('origin.unknown') : missingReason}
      />
      {q.text !== null && !hideBadge ? <OriginBadge origin={origin} /> : null}
      <span className="sr-only">{tooltip}</span>
    </span>
  );
}
