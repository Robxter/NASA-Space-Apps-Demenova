// The Welcome page (block 4, D-036): the project's reception before the app. Three tabs (Home, Instructions, Q&A +
// technical details) and an "Enter the app" action on every tab. It renders outside DataProvider (App.tsx), so the
// demo data loads only when the visitor enters the app. Persuade surface, quiet: the soil core is the only motif, no
// orchestrated motion (DESIGN.md One Moment Rule), press feedback only; theme and language follow the app's prefs.
import { useEffect, useState, type ReactNode } from 'react';
import { Card, DemoChip, Reveal, SeverityBadge } from '../../components/ui';
import { Segmented } from '../../components/shell';
import { href, type WelcomeTab } from '../../state/nav';
import { usePrefs } from '../../state/prefs';
import type { WelcomeContent } from './content';
import en from './content.en';
import es from './content.es';
import { embedUrl, loadIntroVideoId } from './video';
import { HeroArt } from './HeroArt';
import { HowItWorks } from './HowItWorks';
import './welcome.css';

const LEVELS = ['normal', 'watch', 'warning', 'severe'] as const;

/** `**word**` marks a control name: rendered bold as text, never parsed as HTML. */
function rich(text: string): ReactNode {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-ink">{part}</strong> : part));
}

function AppAccess({ c, size = 'md', className = '' }: { c: WelcomeContent; size?: 'md' | 'lg'; className?: string }) {
  const box = size === 'lg' ? 'min-h-12 px-6 text-body' : 'min-h-11 px-4 text-callout';
  return (
    <a
      href={href({ name: 'home' })}
      data-testid="welcome-app-access"
      className={`dn-press inline-flex items-center justify-center gap-2 rounded-control bg-primary font-semibold text-on-primary no-underline ${box} ${className}`}
    >
      {c.appAccess}
      <svg aria-hidden="true" viewBox="0 0 8 14" width="7" height="12" className="shrink-0">
        <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

function Video({ c }: { c: WelcomeContent }) {
  // undefined: still reading site.json; null: no valid link, show the placeholder.
  const [id, setId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void loadIntroVideoId().then((v) => {
      if (live) setId(v);
    });
    return () => {
      live = false;
    };
  }, []);
  return (
    <figure className="welcome-video m-0 aspect-video w-full overflow-hidden rounded-group bg-surface" data-testid="welcome-video">
      {id ? (
        <iframe
          className="block size-full border-0"
          src={embedUrl(id)}
          title={c.home.videoTitle}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          allowFullScreen
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-3 text-center" aria-busy={id === undefined || undefined}>
          {/* The soil core, empty: the same object as the app's glyph, waiting for its content. */}
          <svg aria-hidden="true" viewBox="0 0 28 36" width="28" height="36">
            <rect x="1.5" y="1.5" width="25" height="33" rx="6" fill="none" stroke="var(--dn-ink-3)" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          <figcaption className="text-callout font-semibold text-ink-2">{id === undefined ? c.home.videoTitle : c.home.videoComing}</figcaption>
        </div>
      )}
    </figure>
  );
}

function HomeTab({ c, lang }: { c: WelcomeContent; lang: 'en' | 'es' }) {
  const h = c.home;
  return (
    <div className="flex flex-col gap-8">
      <section className="grid items-center gap-6 lg:grid-cols-2 lg:gap-10" aria-labelledby="welcome-h">
        {/* Entrance: the words arrive in reading order (60 ms steps), the illustration settles in after them. */}
        <div className="dn-stagger flex flex-col gap-4">
          <h1 id="welcome-h" className="m-0 text-display text-ink">
            {h.title}
          </h1>
          <p className="m-0 max-w-[60ch] text-headline font-normal text-ink">{h.lead}</p>
          <p className="m-0 text-footnote text-ink-2">{h.credit}</p>
          <AppAccess c={c} size="lg" className="self-stretch sm:self-start" />
        </div>
        <div className="dn-scale-in [animation-delay:180ms]" data-testid="welcome-hero-art">
          <HeroArt label={h.artLabel} />
        </div>
      </section>

      <HowItWorks title={h.howTitle} steps={h.how} />

      <Reveal as="section" aria-labelledby="welcome-video-h">
        <h2 id="welcome-video-h" className="m-0 mb-2 px-4 text-footnote font-semibold text-ink-2">
          {h.videoTitle}
        </h2>
        <Video c={c} />
      </Reveal>

      <Reveal>
      <Card title={h.whatTitle}>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {h.what.map((line) => (
            <li key={line} className="max-w-[65ch] text-body text-ink">
              {line}
            </li>
          ))}
        </ul>
        <div role="list" aria-label={h.levelsLabel} className="mt-4 flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <span role="listitem" key={l}>
              <SeverityBadge level={l} lang={lang} />
            </span>
          ))}
        </div>
        <p className="m-0 mt-4 flex flex-wrap items-center gap-2 text-callout text-ink-2">
          <DemoChip lang={lang} />
          <span>{h.demoNote}</span>
        </p>
      </Card>
      </Reveal>

      <Reveal>
      <Card title={h.aboutTitle} padded={false}>
        <dl className="dn-list m-0">
          {[
            [h.challengeTitle, h.challenge],
            [h.nameTitle, h.name],
            [h.whoTitle, h.who],
          ].map(([term, text]) => (
            <div key={term} className="grid gap-1 px-4 py-3.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-callout font-semibold text-ink-2">{term}</dt>
              <dd className="m-0 text-pretty text-body text-ink">{text}</dd>
            </div>
          ))}
        </dl>
      </Card>
      </Reveal>
    </div>
  );
}

function InstructionsTab({ c }: { c: WelcomeContent }) {
  const s = c.instructions;
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4" aria-labelledby="welcome-h">
        <h1 id="welcome-h" className="m-0 text-title text-ink">
          {s.title}
        </h1>
        <p className="m-0 max-w-[60ch] text-body text-ink-2">{s.lead}</p>
        <a
          href="/Instructions.pdf"
          download
          data-testid="welcome-pdf"
          className="dn-press inline-flex min-h-12 items-center justify-center gap-2 self-stretch rounded-control bg-surface-2 px-5 text-body font-semibold text-ink no-underline sm:self-start"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />
          </svg>
          {s.download}
        </a>
      </section>

      <Card padded={false}>
        <ul className="dn-list m-0 list-none p-0">
          {s.steps.map((step) => (
            <li key={step.title} className="px-4 py-3.5">
              <h2 className="m-0 text-body font-semibold text-ink">{step.title}</h2>
              <p className="m-0 mt-1 max-w-[65ch] text-callout text-ink-2">{rich(step.body)}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={s.alertsTitle}>
        <div className="flex flex-col gap-3">
          <p className="m-0 max-w-[65ch] text-body text-ink">{rich(s.email)}</p>
          <p className="m-0 max-w-[65ch] text-body text-ink">{rich(s.telegram)}</p>
          <a
            href={s.telegramLink.href}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="welcome-telegram"
            className="inline-flex min-h-11 items-center self-start font-semibold text-leaf underline"
          >
            {s.telegramLink.label}
          </a>
        </div>
      </Card>
    </div>
  );
}

function QaTab({ c }: { c: WelcomeContent }) {
  const q = c.qa;
  return (
    <div className="flex flex-col gap-8">
      <h1 id="welcome-h" className="m-0 text-title text-ink">
        {q.title}
      </h1>
      <Card title={q.questionsTitle} padded={false}>
        <div className="dn-list">
          {q.questions.map((item) => (
            <details key={item.q} className="group px-4">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-body font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <svg aria-hidden="true" viewBox="0 0 14 8" width="12" height="7" className="shrink-0 text-ink-3 group-open:rotate-180">
                  <path d="M1 1l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <p className="m-0 max-w-[65ch] pb-4 text-callout text-ink-2">{item.a}</p>
            </details>
          ))}
        </div>
      </Card>

      <section className="flex flex-col gap-6" aria-labelledby="welcome-tech">
        <h2 id="welcome-tech" className="m-0 text-headline text-ink">
          {q.techTitle}
        </h2>
        {q.tech.map((part) => (
          <Card key={part.title} title={part.title} headingLevel={3}>
            {part.items ? (
              <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-callout text-ink marker:text-ink-3">
                {part.items.map((it) => (
                  <li key={it} className="max-w-[70ch]">
                    {it}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 max-w-[70ch] text-callout text-ink">{part.body}</p>
            )}
          </Card>
        ))}
        <p className="m-0 flex flex-wrap gap-4 px-4">
          {q.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-leaf underline">
              {l.label}
            </a>
          ))}
        </p>
      </section>
    </div>
  );
}

const TAB_ORDER: WelcomeTab[] = ['home', 'instructions', 'qa'];
const TAB_ICONS: Record<WelcomeTab, ReactNode> = {
  // The soil core for the reception's home, a list for instructions, a question mark for Q&A.
  home: (
    <>
      <rect x="6.5" y="3.5" width="11" height="17" rx="3" />
      <path d="M8.5 15h7" />
    </>
  ),
  instructions: <path d="M8 6.5h11M8 12h11M8 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  qa: <path d="M9.2 9.2a2.9 2.9 0 1 1 4 2.7c-.8.4-1.2 1-1.2 1.8v.6M12 17.6h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />,
};

export default function Welcome({ tab }: { tab: WelcomeTab }) {
  const { prefs, set } = usePrefs();
  const lang = prefs.language === 'en' ? 'en' : 'es';
  const c = lang === 'en' ? en : es;

  useEffect(() => {
    document.title = c.docTitle;
  }, [c.docTitle]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <div className="min-h-dvh pb-[calc(64px+env(safe-area-inset-bottom,0px))]" lang={lang}>
      <header className="sticky top-0 z-[1000] border-b border-line bg-bg pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2 sm:gap-3 sm:px-6">
          <a href={href({ name: 'welcome', tab: 'home' })} className="mr-auto flex min-h-11 items-center gap-2 text-ink no-underline">
            <img src="/icons/icon.svg" alt="" width="32" height="32" className="rounded-[8px]" />
            <span className="text-headline font-semibold max-[399px]:sr-only">Demenova</span>
          </a>
          <div className="w-[92px] shrink-0">
            <Segmented
              label={c.languageLabel}
              value={lang}
              onChange={(v) => set('language', v)}
              options={[
                { value: 'es', label: 'ES' },
                { value: 'en', label: 'EN' },
              ]}
            />
          </div>
          <AppAccess c={c} />
        </div>
      </header>

      <main id="welcome-main" key={tab} className="dn-enter-fade mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
        {tab === 'instructions' ? <InstructionsTab c={c} /> : tab === 'qa' ? <QaTab c={c} /> : <HomeTab c={c} lang={lang} />}
      </main>

      <nav
        aria-label={c.tabs.nav}
        className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-surface pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
      >
        <ul className="m-0 mx-auto flex max-w-3xl list-none px-4 py-0">
          {TAB_ORDER.map((t) => {
            const on = t === tab;
            return (
              <li key={t} className="flex-1">
                <a
                  href={href({ name: 'welcome', tab: t })}
                  aria-current={on ? 'page' : undefined}
                  data-testid={`welcome-tab-${t}`}
                  className={`flex min-h-14 touch-manipulation select-none flex-col items-center justify-center gap-0.5 text-caption font-semibold no-underline [-webkit-touch-callout:none] active:opacity-60 ${
                    on ? 'text-leaf' : 'text-ink-3'
                  }`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
                    {TAB_ICONS[t]}
                  </svg>
                  {c.tabs[t]}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
