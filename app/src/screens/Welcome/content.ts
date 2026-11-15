// Shape of the Welcome page copy (D-036). The text lives in content.en.ts and content.es.ts, copied from
// docs/site/welcome-content.md (technical-writer, a7d9ba2) with its bracketed slots filled by the built features.
// `**word**` inside a string marks a control name the reader looks for in the app (rendered bold, never as HTML).

export interface WelcomeLink {
  label: string;
  href: string;
}

export interface WelcomeContent {
  lang: 'en' | 'es';
  /** Page title for the browser tab. */
  docTitle: string;
  tabs: { home: string; instructions: string; qa: string; nav: string };
  /** The App Access button, on every tab. */
  appAccess: string;
  languageLabel: string;
  home: {
    title: string;
    lead: string;
    credit: string;
    videoTitle: string;
    videoComing: string;
    /** Alt text for the hero illustration (abstract: satellites, rain upstream, water rising in a soil core). */
    artLabel: string;
    howTitle: string;
    how: { title: string; body: string }[];
    whatTitle: string;
    what: string[];
    levelsLabel: string;
    demoNote: string;
    aboutTitle: string;
    challengeTitle: string;
    challenge: string;
    nameTitle: string;
    name: string;
    whoTitle: string;
    who: string;
  };
  instructions: {
    title: string;
    lead: string;
    download: string;
    steps: { title: string; body: string }[];
    alertsTitle: string;
    email: string;
    telegram: string;
    telegramLink: WelcomeLink;
  };
  qa: {
    title: string;
    questionsTitle: string;
    questions: { q: string; a: string }[];
    techTitle: string;
    tech: { title: string; items?: string[]; body?: string }[];
    links: WelcomeLink[];
  };
}
