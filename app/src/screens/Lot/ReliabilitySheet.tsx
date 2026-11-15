// "How reliable is this?" sheet (D-028): counts against documented floods, the sensitivity check, the lead-time caveat
// and the known limit. Numbers and quoted passages come from verification.json; the dictionary holds only words.
import { useEffect, useRef } from 'react';
import { Button, Card, EmptyState, List, ListRow } from '../../components/ui';
import { DataValue } from '../../components/DataValue';
import { loadVerification } from '../../data/snapshots';
import { reliabilityFrom } from '../../data/reliability';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { useSnapshot } from '../../state/useSnapshot';
import { formatDate } from '../../time';
import type { MessageKey } from '../../i18n';
import type { Origin } from '../../types/contracts';

function Quote({ text }: { text: string | null }) {
  const { t } = usePrefs();
  if (!text) return <p className="m-0 text-callout text-ink-3">{t('reliability.notInFile')}</p>;
  return (
    <figure className="m-0 mt-2">
      <figcaption className="text-footnote text-ink-3">{t('reliability.fromFile')}</figcaption>
      <blockquote lang="en" className="m-0 mt-1 border-l-2 border-line-strong pl-3 text-footnote text-ink-2">
        {text}
      </blockquote>
    </figure>
  );
}

export default function ReliabilitySheet({ onClose }: { onClose: () => void }) {
  const { prefs, t } = usePrefs();
  const { demo } = useData();
  const file = useSnapshot(() => loadVerification());
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const r = file.status === 'ready' ? reliabilityFrom(file.value.data, demo?.manifest ?? null) : null;
  const count = (label: MessageKey, term: MessageKey, c: { value: number; origin: Origin | null }) => (
    <ListRow title={t(label)} subtitle={t(term)} trailing={<DataValue kind="count" si={c.value} origin={c.origin} at={r?.generatedAt} size="title" />} />
  );

  return (
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="dn-reliability-title" className="fixed inset-0 z-[1100] overflow-y-auto bg-bg">
      <div className="mx-auto max-w-3xl pb-10">
        <header className="flex items-start justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
          <h2 id="dn-reliability-title" className="m-0 mt-2 text-title text-ink">
            {t('reliability.title')}
          </h2>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </header>

        {file.status === 'loading' ? <EmptyState title={t('common.loading')} /> : null}
        {file.status === 'missing' ? <EmptyState tone="missing" title={t('reliability.missing')} /> : null}

        {r ? (
          <div className="flex flex-col gap-5 px-4">
            <p className="m-0 text-callout text-ink-2">{t('reliability.intro')}</p>

            <Card
              title={t('reliability.counts')}
              padded={false}
              footer={r.period ? t('reliability.period', { start: formatDate(r.period[0], prefs.units), end: formatDate(r.period[1], prefs.units) }) : undefined}
            >
              <List>
                {count('reliability.hits', 'reliability.hitsTerm', r.hits)}
                {count('reliability.misses', 'reliability.missesTerm', r.misses)}
                {count('reliability.falseAlarms', 'reliability.falseAlarmsTerm', r.falseAlarms)}
              </List>
            </Card>
            <p className="m-0 -mt-2 px-4 text-footnote text-ink-3">
              {t('reliability.countsOnly')} {t('reliability.falseAlarmNote')}
            </p>

            {r.events.length ? (
              <Card title={t('reliability.events')} padded={false}>
                <List>
                  {r.events.map((e) => (
                    <ListRow
                      key={e.id}
                      title={t(`outcome.${e.outcome}`)}
                      subtitle={`${formatDate(e.start, prefs.units)}${e.end && e.end !== e.start ? ` – ${formatDate(e.end, prefs.units)}` : ''}${
                        e.sources[0] ? ` · ${e.sources[0].citation}` : ''
                      }`}
                    />
                  ))}
                </List>
              </Card>
            ) : null}

            <Card title={t('reliability.sensitivityTitle')}>
              <p className="m-0 text-callout text-ink">{t('reliability.sensitivityText')}</p>
              <Quote text={r.sensitivity} />
            </Card>

            <Card title={t('reliability.leadTitle')}>
              <p className="m-0 text-callout text-ink">{t('reliability.leadText')}</p>
              <Quote text={r.leadTime} />
            </Card>

            <Card title={t('reliability.limitTitle')}>
              <p className="m-0 text-callout text-ink">{t('reliability.limitText')}</p>
              <Quote text={r.knownLimits} />
            </Card>

            <p className="m-0 px-4 text-footnote text-ink-3">{t('reliability.severeDesign')}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
