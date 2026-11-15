// Strategies (SPEC 18, D-028): three options per lot (A current, B improved drainage, C drainage + living cover +
// bio-inputs) from domain/strategies.yaml via strategies.json. Reasons, evidence, gaps and risks; cost and labour
// only when sourced, else "not estimated". Nothing here is reviewed by a local agronomist, and the screen says so.
import { Card, EmptyState, MissingData } from '../../components/ui';
import { DataValue, OriginBadge } from '../../components/DataValue';
import { ScreenHeader } from '../../components/shell';
import { loadStrategies, resolveProvenance, sourceLabel } from '../../data/snapshots';
import { strategiesForUnit, isSourcedScore, localized } from '../../data/strategies';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { useSnapshot } from '../../state/useSnapshot';
import { formatDate } from '../../time';
import type { LocalizedText, NumericValue, Strategy } from '../../types/contracts';
import type { MessageKey } from '../../i18n';

function Text({ value }: { value: LocalizedText | null | undefined }) {
  const { prefs } = usePrefs();
  const text = localized(value, prefs.language);
  return text === null ? <MissingData lang={prefs.language} /> : <>{text}</>;
}

export function NotReviewedBadge() {
  const { t } = usePrefs();
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-line-strong px-2 py-0.5 text-caption font-semibold text-ink-2">
      {t('strategies.notReviewed')}
    </span>
  );
}

function Score({ label, score, mustBeSourced }: { label: MessageKey; score: NumericValue; mustBeSourced: boolean }) {
  const { t } = usePrefs();
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-callout text-ink-2">{t(label)}</span>
      {mustBeSourced && !isSourcedScore(score) ? (
        <span className="text-callout text-ink-3">{t('strategies.notEstimated')}</span>
      ) : (
        <span className="flex items-center gap-1">
          <DataValue kind="count" si={score.value} origin={score.origin} source={score.source ?? score.estimated_by ?? null} hideBadge />
          <span className="text-footnote text-ink-3">{t('strategies.outOf5')}</span>
          {score.value !== null ? <OriginBadge origin={score.origin} /> : null}
        </span>
      )}
    </div>
  );
}

function StrategyCard({ s }: { s: Strategy }) {
  const { prefs, t } = usePrefs();
  const section = (title: MessageKey, value: LocalizedText) => (
    <div>
      <h4 className="m-0 text-footnote font-semibold text-ink-2">{t(title)}</h4>
      <p className="m-0 mt-0.5 text-callout text-ink">
        <Text value={value} />
      </p>
    </div>
  );
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-headline text-ink">
          {s.label}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-headline text-ink">
            <span className="sr-only">{t('strategies.option', { label: s.label })}: </span>
            {t(`strategies.title.${s.label}`)}
          </h3>
          <p className="m-0 mt-1 text-callout text-ink">
            <Text value={s.what} />
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {s.approved_by ? null : <NotReviewedBadge />}
            <OriginBadge origin={s.origin} />
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-line pt-2">
        <Score label="strategies.score.soil" score={s.scores.soil} mustBeSourced={false} />
        <Score label="strategies.score.water" score={s.scores.water} mustBeSourced={false} />
        <Score label="strategies.score.cost" score={s.scores.cost} mustBeSourced />
        <Score label="strategies.score.labour" score={s.scores.labour} mustBeSourced />
      </div>

      <details className="mt-2 border-t border-line pt-2">
        <summary className="flex min-h-12 cursor-pointer items-center text-body font-semibold text-leaf">{t('strategies.details')}</summary>
        <div className="flex flex-col gap-3 pb-1">
          {section('strategies.why', s.why)}
          <div>
            <h4 className="m-0 text-footnote font-semibold text-ink-2">{t('strategies.evidence')}</h4>
            {s.evidence.length ? (
              <ul className="m-0 mt-0.5 list-disc pl-5 text-callout text-ink">
                {s.evidence.map((e) => (
                  <li key={e.citation}>
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-leaf">
                        {e.citation}
                      </a>
                    ) : (
                      e.citation
                    )}
                    {e.accessed ? <span className="text-ink-3"> · {t('strategies.accessed', { date: formatDate(String(e.accessed), prefs.units) })}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <MissingData lang={prefs.language} />
            )}
          </div>
          {section('strategies.benefits', s.benefits)}
          {section('strategies.gaps', s.gaps)}
          {section('strategies.risks', s.risks)}
        </div>
      </details>
    </Card>
  );
}

export default function Strategies({ id }: { id: string }) {
  const { t } = usePrefs();
  const { unitName, demo } = useData();
  const file = useSnapshot(() => loadStrategies());
  const list = file.status === 'ready' ? strategiesForUnit(file.value.data.strategies, id) : [];
  const source = file.status === 'ready' ? sourceLabel(resolveProvenance(file.value.data.provenance, demo?.manifest ?? null)) : null;

  return (
    <div className="pb-28">
      <ScreenHeader title={t('strategies.title')} back={{ name: 'lot', id }}>
        <p className="m-0 mt-1 text-footnote text-ink-3">{unitName(id)}</p>
      </ScreenHeader>
      <div className="flex flex-col gap-4 px-4">
        {file.status === 'loading' ? <EmptyState title={t('common.loading')} /> : null}
        {file.status === 'missing' || (file.status === 'ready' && list.length === 0) ? (
          <EmptyState tone="missing" title={t('strategies.none')} />
        ) : null}
        {list.map((s) => (
          <StrategyCard key={s.strategy_id} s={s} />
        ))}
        {source ? <p className="m-0 px-4 text-footnote text-ink-3">{t('common.source', { source })}</p> : null}
      </div>
      {/* Fixed footer (SPEC 17, 18): always visible above the tab bar. */}
      <p
        role="note"
        className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-[999] m-0 border-t border-line bg-surface px-4 py-2.5 text-center text-footnote font-semibold text-ink"
      >
        {t('strategies.disclaimer')}
      </p>
    </div>
  );
}
