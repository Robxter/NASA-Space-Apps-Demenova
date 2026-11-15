// Source and freshness on their own lines (copy-proposals "Separators", CL-07). For a domain table (not a dataset) the
// short label "Source: Demenova guidance table (not a dataset)" shows, with the provenance note one tap away; the
// provenance record itself is unchanged.
import { usePrefs } from '../state/prefs';
import { formatInstant } from '../time';

export function SourceLines({
  source,
  at,
  guidanceNote,
  label: shortLabel,
}: {
  /** Dataset names, or null. Ignored when guidanceNote is set. */
  source?: string | null;
  /** UTC timestamp shown as "Updated ...". */
  at?: string | null;
  /** Provenance note of a domain table: switches to the short guidance label with this note behind a disclosure. */
  guidanceNote?: string | null;
  /** Short label replacing the guidance-table wording (e.g. the demo farm record), used with guidanceNote. */
  label?: string;
}) {
  const { prefs, t } = usePrefs();
  const updated = formatInstant(at, prefs.units, prefs.language);
  const label =
    guidanceNote !== undefined && guidanceNote !== null
      ? (shortLabel ?? t('common.sourceGuidance'))
      : source
        ? t('common.source', { source })
        : null;
  if (!label && !updated) return null;
  return (
    <>
      {label ? <span className="block">{label}</span> : null}
      {updated ? <span className="block">{t('common.updated', { time: updated })}</span> : null}
      {guidanceNote ? (
        <details className="mt-1">
          <summary className="min-h-11 cursor-pointer touch-manipulation select-none py-2 text-leaf">{t('common.provenanceNote')}</summary>
          <span className="block">{guidanceNote}</span>
        </details>
      ) : null}
    </>
  );
}
