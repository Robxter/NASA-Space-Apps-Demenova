// Learn (SPEC 18): short glossary cards from domain/glossary.yaml (glossary.json), each labelled as general guidance
// not reviewed by an agronomist (D-025), plus where each dataset comes from, read from the snapshot manifest.
import { Card, EmptyState } from '../../components/ui';
import { OriginBadge } from '../../components/DataValue';
import { ScreenHeader } from '../../components/shell';
import { loadGlossary } from '../../data/snapshots';
import { localized } from '../../data/strategies';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { useSnapshot } from '../../state/useSnapshot';

export default function Learn() {
  const { prefs, t } = usePrefs();
  const { demo } = useData();
  const file = useSnapshot(() => loadGlossary());
  const terms = file.status === 'ready' ? file.value.data.terms : [];
  const datasets = [...new Map((demo?.manifest.provenance ?? []).filter((p) => p.dataset).map((p) => [p.dataset, p])).values()];

  return (
    <div className="pb-4">
      <ScreenHeader title={t('learn.title')} />
      <div className="flex flex-col gap-4 px-4">
        <p className="m-0 rounded-control border border-dashed border-line-strong px-3 py-2 text-callout text-ink-2">{t('learn.general')}</p>
        {file.status === 'loading' ? <EmptyState title={t('common.loading')} /> : null}
        {file.status === 'missing' ? <EmptyState tone="missing" title={t('learn.missing')} /> : null}
        {terms.map((term) => {
          const title = localized(term.term, prefs.language);
          const body = localized(term.definition, prefs.language);
          if (!title || !body) return null;
          return (
            <Card key={term.term_id}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="m-0 text-headline text-ink">{title}</h2>
                <OriginBadge origin={term.origin} />
              </div>
              <p className="m-0 mt-1 text-callout text-ink">{body}</p>
              <p className="m-0 mt-2 text-footnote text-ink-3">
                {t('learn.notReviewed')}
                {term.source ? (
                  <>
                    {' · '}
                    {/^https?:\/\//.test(term.source) ? (
                      <a href={term.source} target="_blank" rel="noopener noreferrer" className="text-leaf">
                        {t('learn.source')}
                      </a>
                    ) : (
                      t('common.source', { source: term.source })
                    )}
                  </>
                ) : null}
              </p>
            </Card>
          );
        })}

        {datasets.length ? (
          <Card title={t('learn.datasets')}>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {datasets.map((p) => (
                <li key={p.id} className="text-callout text-ink">
                  <span className="font-semibold">{p.dataset}</span>
                  {p.version ? <span className="text-ink-2"> {p.version}</span> : null}
                  {p.provider ? <span className="block text-footnote text-ink-2">{p.provider}</span> : null}
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-footnote text-leaf">
                      {t('learn.datasetPage')}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <p className="m-0 px-4 text-center text-footnote text-ink-3">{t('app.credit')}</p>
      </div>
    </div>
  );
}
