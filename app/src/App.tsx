// App shell: preferences and data providers, hash navigation, bottom tab bar. Map and Lot are lazy chunks
// (Leaflet and uPlot never load on Home); supabase-js loads after first paint (data/identity.ts).
import { lazy, Suspense, useEffect, useMemo } from 'react';
import { EmptyState } from './components/ui';
import { TabBar } from './components/shell';
import Home from './screens/Home/Home';
import { Alerts, Settings } from './screens/Other';
import { parseHash, tabOf, useHash } from './state/nav';
import { DataProvider } from './state/data';
import { PrefsProvider, usePrefs } from './state/prefs';

const MapView = lazy(() => import('./screens/Map/MapView'));
const Lot = lazy(() => import('./screens/Lot/Lot'));
const Strategies = lazy(() => import('./screens/Strategies/Strategies'));
const Setup = lazy(() => import('./screens/Setup/Setup'));
const Learn = lazy(() => import('./screens/Learn/Learn'));
// Block 4 (D-036): the Welcome page (empty hash, #welcome...) is its own chunk and renders OUTSIDE DataProvider,
// so a visitor reading it never triggers the demo data load; the data loads when they enter the app.
const Welcome = lazy(() => import('./screens/Welcome/Welcome'));
// break-ui toggle: dev builds only; production builds drop it (import.meta.env.DEV is false there).
const DevDataToggle = import.meta.env.DEV ? lazy(() => import('./dev/DataToggle')) : null;

function Screens() {
  const hash = useHash();
  const { route } = useMemo(() => parseHash(hash), [hash]);
  const { t } = usePrefs();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);

  let screen;
  switch (route.name) {
    case 'map':
      screen = <MapView />;
      break;
    case 'lot':
      screen = <Lot id={route.id} />;
      break;
    case 'strategies':
      screen = <Strategies id={route.id} />;
      break;
    case 'alerts':
      screen = <Alerts />;
      break;
    case 'learn':
      screen = <Learn />;
      break;
    case 'settings':
      screen = <Settings />;
      break;
    case 'setup':
      screen = <Setup />;
      break;
    default:
      screen = <Home />;
  }

  return (
    <>
      {/* A button, not an anchor: "#main" would be read as a route by the hash navigation. */}
      <button type="button" className="sr-only focus:not-sr-only" onClick={() => document.getElementById('main')?.focus()}>
        {t('app.skip')}
      </button>
      {/* Landscape notch: side insets pad the content, the background still runs edge to edge (mobile-native fix 7). */}
      <main
        id="main"
        tabIndex={-1}
        className={`mx-auto min-h-dvh ${route.name === 'map' ? 'max-w-none' : route.name === 'home' ? 'max-w-3xl lg:max-w-5xl' : 'max-w-3xl'} pb-[calc(64px+env(safe-area-inset-bottom,0px))] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]`}
      >
        <Suspense fallback={<EmptyState title={t('common.loading')} />}>{screen}</Suspense>
      </main>
      <TabBar current={tabOf(route)} />
      {DevDataToggle ? (
        <Suspense fallback={null}>
          <DevDataToggle />
        </Suspense>
      ) : null}
    </>
  );
}

function Root({ initialDate }: { initialDate: string | null }) {
  const hash = useHash();
  const { route } = useMemo(() => parseHash(hash), [hash]);
  if (route.name === 'welcome') {
    return (
      <Suspense fallback={null}>
        <Welcome tab={route.tab} />
      </Suspense>
    );
  }
  return (
    <DataProvider initialDate={initialDate}>
      <Screens />
    </DataProvider>
  );
}

export default function App() {
  const initialDate = useMemo(() => parseHash(window.location.hash).date, []);
  return (
    <PrefsProvider>
      <Root initialDate={initialDate} />
    </PrefsProvider>
  );
}
