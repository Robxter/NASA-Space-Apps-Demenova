// The check for the current level (domain/actions.yaml): farmer wording in farmer mode, agronomist wording otherwise.
// Text is shown exactly as written in the domain file, with its origin and the not-reviewed badge.
import { Card } from './ui';
import { OriginBadge } from './DataValue';
import { checkFor, isReviewed } from '../data/actions';
import { loadActions, resolveProvenance } from '../data/snapshots';
import { SourceLines } from './SourceLines';
import { localized } from '../data/strategies';
import { useData } from '../state/data';
import { usePrefs } from '../state/prefs';
import { useSnapshot } from '../state/useSnapshot';
import type { Severity } from '../types/contracts';

export function NotReviewedBadge() {
  const { t } = usePrefs();
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-line-strong px-2 py-0.5 text-caption font-semibold text-ink-2">
      {t('strategies.notReviewed')}
    </span>
  );
}

export function LevelCheck({ level }: { level: Severity | null | undefined }) {
  const { prefs, t } = usePrefs();
  const { demo } = useData();
  const file = useSnapshot(() => loadActions());
  if (file.status !== 'ready') return null;
  const entry = checkFor(file.value.data.actions, level, prefs.mode);
  const text = entry ? localized(entry.text, prefs.language) : null;
  if (!entry || !text) return null;
  const records = resolveProvenance(file.value.data.provenance, demo?.manifest ?? null);
  const note = records.find((r) => r.notes)?.notes ?? null;
  return (
    <Card title={t('check.title')} footer={<SourceLines at={file.value.data.generated_at} guidanceNote={note} />}>
      {/* CL-22: prose measure capped on desktop. */}
      <p className="m-0 max-w-[65ch] text-body text-ink">{text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {isReviewed(entry) ? null : <NotReviewedBadge />}
        <OriginBadge origin={entry.origin} />
      </div>
    </Card>
  );
}
