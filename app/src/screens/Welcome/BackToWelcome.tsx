// The way back from the app to the Welcome page (D-036): the Demenova mark next to the gear on Home, and a row in
// Settings. Labels live here (not in i18n/en.ts or es.ts) so this block does not edit the app dictionaries.
import { href } from '../../state/nav';
import { usePrefs } from '../../state/prefs';

const LABEL = {
  en: { short: 'Welcome page', long: 'Open the welcome page', hint: 'Introduction, instructions and questions about Demenova.' },
  es: { short: 'Página de bienvenida', long: 'Abrir la página de bienvenida', hint: 'Introducción, instrucciones y preguntas sobre Demenova.' },
} as const;

const TO = href({ name: 'welcome', tab: 'home' });

/** Icon button for the Home header: the Demenova mark, 48 px, beside the gear. */
export function WelcomeMarkLink() {
  const { prefs } = usePrefs();
  const l = LABEL[prefs.language === 'en' ? 'en' : 'es'];
  return (
    <a
      href={TO}
      aria-label={l.short}
      title={l.short}
      data-testid="back-to-welcome"
      className="dn-press flex size-12 touch-manipulation select-none items-center justify-center rounded-full [-webkit-touch-callout:none]"
    >
      <img src="/icons/icon.svg" alt="" width="28" height="28" className="rounded-[7px]" />
    </a>
  );
}

/** A full-width row for Settings. */
export function WelcomeRow() {
  const { prefs } = usePrefs();
  const l = LABEL[prefs.language === 'en' ? 'en' : 'es'];
  return (
    <a
      href={TO}
      data-testid="settings-welcome"
      className="dn-press flex min-h-14 items-center gap-3 rounded-group bg-surface px-4 py-3 text-ink no-underline"
    >
      <img src="/icons/icon.svg" alt="" width="32" height="32" className="shrink-0 rounded-[8px]" />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold">{l.long}</span>
        <span className="block text-footnote text-ink-2">{l.hint}</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 8 14" width="7" height="12" className="shrink-0 text-ink-3">
        <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
