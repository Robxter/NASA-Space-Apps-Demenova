// English copy of the Welcome page, from docs/site/welcome-content.md (a7d9ba2). Alerts: Telegram Variant A (the bot
// @DemenovaBot is built) and Roberto's email wording. CSV labels match app/src/i18n/en.ts (setup.csvTemplate, setup.importCsv).
import type { WelcomeContent } from './content';

const en: WelcomeContent = {
  lang: 'en',
  docTitle: 'Demenova: flood alerts for banana farms in El Oro',
  tabs: { home: 'Home', instructions: 'Instructions', qa: 'Q&A', nav: 'Welcome sections' },
  appAccess: 'Enter the app',
  languageLabel: 'Language',
  home: {
    title: 'Demenova',
    lead: 'Waterlogging and flood alerts for banana farms in coastal El Oro, Ecuador. No sensors, no records needed: a pin on the map is enough to start.',
    credit: 'Built with NASA Earth observations. Demenova is an independent project, not endorsed by NASA.',
    videoTitle: 'Demenova in 30 seconds',
    videoComing: 'Video coming soon',
    artLabel: 'Illustration: satellites in orbit, rain falling upstream and water rising in a soil core in the ground.',
    howTitle: 'From orbit to the root zone',
    how: [
      { title: 'Open data from orbit', body: 'Rain, weather, terrain and greenness from NASA and Copernicus Sentinel-2.' },
      { title: 'One index per lot', body: 'Five factors make the alert index W, from 0 to 1, every day.' },
      { title: 'A level you can act on', body: 'Normal, Watch, Warning or Severe, in colour and word, with the reason.' },
    ],
    whatTitle: 'What it does',
    what: [
      'Rates each lot every day: Normal, Watch, Warning or Severe, always as colour and word.',
      'Shows why: upstream rain, soil saturation, terrain wetness, local rain and the 7-day water balance.',
      'Keeps a history and suggests three soil and water strategies per lot.',
      'Shows how reliable it is, as counts, and what it does not know.',
    ],
    levelsLabel: 'The four alert levels',
    demoNote:
      'The demo replays 20 Jan to 5 Mar 2026 around the 22-23 Feb Buenavista river flood (Pasaje, El Oro) on a synthetic demo farm.',
    aboutTitle: 'About the project',
    challengeTitle: 'The challenge',
    challenge: 'Built for the 2026 NASA Space Apps Challenge, challenge "Field Shift: Adapting Farms with NASA Data".',
    nameTitle: 'The name',
    name: 'Demenova = Demeter, the Greek goddess of the harvest, + nova, a new star.',
    whoTitle: 'Who am I',
    who: 'Cristian Roberto Terán Paredes, product owner and builder of Demenova, built solo for NASA Space Apps 2026.',
  },
  instructions: {
    title: 'How to use the app',
    lead: 'Every screen, in the order you meet them. The replay day you choose on Home drives all of them.',
    download: 'Download Instructions.pdf',
    steps: [
      {
        title: 'Home',
        body: 'Farm status: the highest level today, lots by risk with their top factor, and the **Replay** control. Drag the replay day or tap **Play replay**; every screen follows that day. It opens on 23 Feb 2026.',
      },
      {
        title: 'Map',
        body: 'Risk map: lots coloured by level over NASA GIBS imagery. Layers: Alert level, Wetness, Rain 24 h. Imagery: Satellite (default), Streets, True colour or Relief. Tap a lot, then **Open lot**.',
      },
      {
        title: 'Lot detail',
        body: "Index W, **Why** (five factors and their share), today's values, **History** (1W, 1M, 3M) and **Lot facts**. Every number carries its origin badge; a missing value shows **No data**.",
      },
      {
        title: 'How reliable is this?',
        body: 'From Lot: hits, misses and false alarms against documented floods, the weight check, warning time and the known limit.',
      },
      {
        title: 'Strategies',
        body: 'From Lot: three options (Current management, Improved drainage, Drainage, living cover and bio-inputs) with why, evidence, gaps and risks. Not yet reviewed by a local agronomist.',
      },
      {
        title: 'Alerts',
        body: 'Level changes, newest first, with the email test and the Telegram bot (below).',
      },
      { title: 'Learn', body: "Short definitions of the app's words and where the data comes from." },
      {
        title: 'Farm setup (Settings)',
        body: 'Level 0: drop a pin. Level 1: trace the outline. Level 2: add exact lots by drawing, importing a GeoJSON file or typing them; in step 3 you can also **Download CSV template**, fill one row per lot, and **Import CSV**. Alerts for your own farm need an engine run for its location.',
      },
      {
        title: 'Settings',
        body: 'Language, Units (Metric or Imperial, display only), Mode (Farmer or Agronomist), Storage (Full or Data saver), Theme (System, Light, Dark), **Export records (CSV)**, and **Connect this device for sync**.',
      },
    ],
    alertsTitle: 'Alerts by email and Telegram',
    email:
      "Email: in **Email alerts** on the Alerts screen, type your email and tap **Send me a test Severe alert**. During the demo, delivery works only for the project owner's address; delivery to any address is a future update in development.",
    telegram:
      'Telegram: in **Telegram alerts** on the Alerts screen, tap **Open @DemenovaBot** and send /start to receive Severe alerts for the demo farm; /stop stops them.',
    telegramLink: { label: 'Open @DemenovaBot in Telegram', href: 'https://t.me/DemenovaBot?start' },
  },
  qa: {
    title: 'Questions and technical details',
    questionsTitle: 'Questions',
    questions: [
      {
        q: 'Does it predict floods?',
        a: 'No. It rates waterlogging and flood risk from rain, soil and terrain. In the 2026 replay the wettest demo lots (1 and 2) were already Severe from earlier storms, and the February flood rain reached the index only after the overflow was reported.',
      },
      {
        q: 'Is the farm real?',
        a: 'No. "Finca Demo El Oro" and its 8 lots are synthetic and labelled Demo. The rain, weather, terrain and imagery under them are real data.',
      },
      {
        q: 'Where does the data come from?',
        a: 'Global open datasets: NASA GPM IMERG, NASA POWER, NASA SRTM, NASA GIBS, Copernicus Sentinel-2 and OpenStreetMap. Full list below.',
      },
      {
        q: 'Does it work offline?',
        a: 'Yes, for what it has already loaded: it installs to the home screen and shows saved data with the time it was saved.',
      },
      { q: 'Is it free?', a: 'The demo needs no account and no payment.' },
      {
        q: 'What about my data?',
        a: 'Your farm is saved on your device first. Sync is optional, needs no account or email, and uses a private device identity. Email addresses are not stored in the alert log; only a hash is kept.',
      },
      {
        q: 'How reliable is it?',
        a: "In the farm's catchment in 2026: 1 hit, 0 misses, 4 false alarms. Four documented floods are too few to claim accuracy, so Demenova shows counts only.",
      },
      {
        q: 'Why is a lot Severe for weeks?',
        a: 'The index compares each day with the whole year, so wet-season days stay high. Seasonal comparison is planned.',
      },
      {
        q: 'Who checked the agronomy?',
        a: "Nobody local yet. Every threshold and strategy shows its origin and review status so a local agronomist can check and tune it. Demenova supports the agronomist's judgment; it never replaces it.",
      },
      {
        q: 'Can I use it for my farm?',
        a: 'You can add your pin, outline and lots. Alerts for a new farm need an engine run for its location; only the El Oro area has been run.',
      },
    ],
    techTitle: 'Technical details',
    tech: [
      {
        title: 'Data used',
        items: [
          'Rain: NASA GPM IMERG Early Run daily, GPM_3IMERGDE V07 (V07B to 3 Mar 2026, V07C after), NASA GES DISC.',
          'Weather for evapotranspiration: NASA POWER Daily API v2.10.3; hourly API v2.10.4 for the replay window.',
          'Terrain and catchment: NASA SRTM SRTMGL1 v003 (30 m), via OpenTopography.',
          'Greenness (NDVI): Copernicus Sentinel-2 L2A, Element 84 Earth Search STAC v1.',
          'Map imagery: NASA GIBS (Landsat WELD annual true colour with reference roads and place names, MODIS Terra true colour, ASTER GDEM shaded relief) and OpenStreetMap streets (© OpenStreetMap contributors).',
          'River: OpenStreetMap contributors (ODbL).',
          'Evaluated, not used: SMAP SPL3SMP_E v006 (no recommended-quality retrieval over the farm in the replay; D-019) and GLDAS Noah 2.1 (downloaded for the replay window, not used by the index or shown in the app).',
        ],
      },
      {
        title: 'Method in short',
        body: 'Index W (0 to 1) = design weights × five indicators: upstream 72 h rain over the 253.8 km² Río Buenavista catchment, soil saturation (antecedent precipitation index), terrain wetness (TWI from SRTM), local rain, and the 7-day balance of rain minus FAO-56 crop evapotranspiration. Rain and balance are percentiles against earlier days. Levels: Watch 0.40, Warning 0.60, Severe 0.90 (a design choice, not fitted or validated; D-029).',
      },
      {
        title: 'Stack',
        body: 'React + TypeScript PWA (Vite, Tailwind, Leaflet, uPlot); Python pipeline (xarray, rasterio); Supabase Postgres with row-level security; FastAPI backend on Render for email; GitHub Actions for CI.',
      },
      {
        title: 'Verification (counts only)',
        body: "Documented floods in the farm's catchment, 1 Jan to 13 Nov 2026: 1 hit, 0 misses, 4 false alarms. A false alarm means no flood in the press reports checked, not proof that none happened.",
      },
      {
        title: 'Limits',
        body: 'Synthetic demo farm; design weights and thresholds; no flood-specific warning time in February 2026; weight check not stable in 10 of 10 runs, though lots 1 and 2 are Severe on the flood days in every run; whole-year percentiles keep wet-season days high; only El Oro has been run; agronomic guidance not yet reviewed by a local agronomist.',
      },
      {
        title: 'How AI tools were used',
        body: 'Code, tests and documents were produced with Claude Code (Anthropic) working as specialised agents under written rules (no invented data, a source or a label for every number), with independent science and security reviews. Roberto chose the problem, place and scope and made the key decisions, including the Severe threshold and the replay window. Log: docs/SI_USE_LOG.md in the repository.',
      },
    ],
    links: [
      { label: 'Code on GitHub', href: 'https://github.com/Robxter/NASA-Space-Apps-Demenova' },
    ],
  },
};

export default en;
