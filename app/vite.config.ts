/// <reference types="vitest/config" />
// Vite config for the Demenova PWA (ADR-001, ADR-004). Owner: frontend-engineer.
// Type-checked by Vite's transpile only; `npm run typecheck` covers src/.
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // The manifest is the committed file app/public/manifest.webmanifest (CONTRACTS.md §1), linked in index.html.
      manifest: false,
      workbox: {
        // App shell, including the lazy Map and Lot chunks, so offline reopen works on every screen (ADR-004).
        globPatterns: ['**/*.{js,css,html,webmanifest,png,svg}'],
        // Snapshots are cached at runtime (below) and in IndexedDB, never precached: they change with each engine run.
        // The About page (app/public/about/, static) is never precached and never answered with the app shell.
        globIgnores: ['data/**', 'about/**'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/about\//],
        runtimeCaching: [
          {
            // Demo snapshots: fresh copy when online, cached copy when offline.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/data/demo/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'demo-snapshots',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // NASA GIBS imagery tiles (Full storage mode). Data saver deletes this cache (state/prefs.tsx).
            urlPattern: ({ url }) => url.hostname === 'gibs.earthdata.nasa.gov',
            handler: 'CacheFirst',
            options: {
              cacheName: 'gibs-tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
