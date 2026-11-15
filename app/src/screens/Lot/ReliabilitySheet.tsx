// "How reliable is this?" sheet (D-028): counts against documented floods, the sensitivity check, the lead-time caveat
// and the known limit. Numbers and quoted passages come from verification.json; the dictionary holds only words.
import { useEffect, useRef } from 'react';
import { prefersReducedMotion, tokenMs } from '../../motion';
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
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const closing = useRef(false);
  const drag = useRef<{ y0: number; dy: number; t: number; v: number } | null>(null);

  // Native modal dialog (pick-ui-library: no hand-made focus trap): Tab stays inside, Escape closes, page is inert.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    opener.current = document.activeElement;
    if (!el.open) el.showModal();
    return () => {
      if (el.open) el.close();
    };
  }, []);

  /** One exit for the close button, Escape and the drag: the sheet leaves by the edge it came from. */
  const dismiss = () => {
    const el = dialog.current;
    if (!el || closing.current) return;
    closing.current = true;
    const done = () => {
      if (el.open) el.close();
      if (opener.current instanceof HTMLElement && opener.current !== document.body) opener.current.focus();
      onClose(); // the caller returns focus to the control that opened the sheet
    };
    if (prefersReducedMotion()) return done();
    el.style.transition = `transform ${tokenMs('--dn-dur-state', 200)}ms var(--dn-ease-out)`;
    el.style.transform = 'translateY(100%)';
    window.setTimeout(done, tokenMs('--dn-dur-state', 200));
  };

  // Drag to dismiss (gestures skill): track 1:1 with direct transform writes, rubber-band upwards, release on
  // distance (35 % of the height) or velocity (0.5 px/ms); otherwise a fast snap back. Interruptible: a new press
  // during the snap back takes over from where the sheet is.
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('button, a')) return;
    const el = dialog.current;
    if (!el || closing.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const current = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42 || 0;
    el.style.transition = 'none';
    drag.current = { y0: e.clientY - current, dy: current, t: performance.now(), v: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = dialog.current;
    if (!d || !el) return;
    const raw = e.clientY - d.y0;
    const dy = raw < 0 ? raw * 0.2 : raw;
    const now = performance.now();
    d.v = (dy - d.dy) / Math.max(now - d.t, 1);
    d.dy = dy;
    d.t = now;
    el.style.transform = `translateY(${dy}px)`;
  };
  const onPointerUp = () => {
    const d = drag.current;
    const el = dialog.current;
    drag.current = null;
    if (!d || !el) return;
    if (d.dy > el.clientHeight * 0.35 || d.v > 0.5) return dismiss();
    el.style.transition = prefersReducedMotion() ? 'none' : `transform ${tokenMs('--dn-dur-state', 200)}ms var(--dn-ease-out)`;
    el.style.transform = '';
  };

  const r = file.status === 'ready' ? reliabilityFrom(file.value.data, demo?.manifest ?? null) : null;
  const count = (label: MessageKey, term: MessageKey, c: { value: number; origin: Origin | null }) => (
    <ListRow title={t(label)} subtitle={t(term)} trailing={<DataValue kind="count" si={c.value} origin={c.origin} at={r?.generatedAt} size="title" />} />
  );

  return (
    <dialog
      ref={dialog}
      aria-labelledby="dn-reliability-title"
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-bg p-0 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] text-ink transition-[translate,opacity] duration-sheet ease-drawer backdrop:bg-ink/40 starting:translate-y-full motion-reduce:transition-none motion-reduce:starting:translate-y-0"
    >
      <div className="mx-auto max-w-3xl pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        <header
          className="sticky top-0 z-10 touch-none select-none bg-bg px-4 pt-[max(env(safe-area-inset-top),8px)] pb-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span aria-hidden="true" className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-line-strong" />
          <div className="flex items-start justify-between gap-3">
            <h2 id="dn-reliability-title" className="m-0 mt-2 text-title text-ink">
              {t('reliability.title')}
            </h2>
            <Button variant="secondary" onClick={dismiss}>
              {t('common.close')}
            </Button>
          </div>
        </header>

        {file.status === 'loading' ? <EmptyState title={t('common.loading')} /> : null}
        {file.status === 'missing' ? <EmptyState tone="missing" title={t('reliability.missing')} body={t('common.missingFileBody')} /> : null}

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
                      subtitle={
                        <>
                          <span className="block tabular-nums">
                            {formatDate(e.start, prefs.units)}
                            {e.end && e.end !== e.start ? ` – ${formatDate(e.end, prefs.units)}` : ''}
                          </span>
                          {e.sources[0] ? <span className="block truncate">{e.sources[0].citation}</span> : null}
                        </>
                      }
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
    </dialog>
  );
}
