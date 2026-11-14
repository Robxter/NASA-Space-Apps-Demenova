// Vite config for the Demenova PWA (ADR-001, ADR-004). Owner: frontend-engineer after phase 0.
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
        // App shell only. Caching of app/public/data/demo and imagery follows ADR-004 and is added in T-026.
        globPatterns: ['**/*.{js,css,html,webmanifest}'],
      },
    }),
  ],
});
