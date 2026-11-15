#!/usr/bin/env node
// Static server for the e2e suite (T-044). Owner: qa-demo-engineer. Node built-ins only (no dependency).
// Serves the production build app/dist with gzip, the way a static host (Render Static Site) would, so the
// throttled runs measure compressed transfers. Unknown paths fall back to index.html (hash navigation needs none,
// but a judge may open "/" with any path). Usage: node tests/e2e/serve.mjs [port] [--csp]
// --csp sends the exact Content-Security-Policy that render.yaml sets for path /* on the live site (read from the
// file at start, never copied here), so specs/csp.spec.ts sees what a judge's browser enforces.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT = join(REPO, 'app', 'dist');
const ARGS = process.argv.slice(2);
const PORT = Number(ARGS.find((a) => /^\d+$/.test(a)) ?? process.env.E2E_PORT ?? 4173);

/** The CSP header value render.yaml sets on `/*` (the line after `name: Content-Security-Policy`). */
function renderCsp() {
  const lines = readFileSync(join(REPO, 'render.yaml'), 'utf-8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*name:\s*Content-Security-Policy\s*$/.test(lines[i])) continue;
    const path = /^\s*-\s*path:\s*(\S+)/.exec(lines[i - 1] ?? '')?.[1];
    const value = /^\s*value:\s*"(.*)"\s*$/.exec(lines[i + 1] ?? '')?.[1];
    if (path === '/*' && value) return value;
  }
  throw new Error('render.yaml: no Content-Security-Policy value for path /*');
}
const CSP = ARGS.includes('--csp') ? renderCsp() : null;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.geojson', '.webmanifest', '.svg', '.txt']);

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error(`No build at ${ROOT}. Run: npm --prefix app run build`);
  process.exit(1);
}

const gzCache = new Map();

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  let file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT + sep) && file !== ROOT) {
    res.writeHead(403).end();
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    // Missing data files must stay 404 (the app shows "No data"); only page routes fall back to the shell.
    if (rel.startsWith('/data/') || rel.startsWith('/assets/') || extname(rel)) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
      return;
    }
    file = join(ROOT, 'index.html');
  }
  const ext = extname(file).toLowerCase();
  const headers = {
    'content-type': TYPES[ext] ?? 'application/octet-stream',
    'cache-control': rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
  if (CSP) headers['content-security-policy'] = CSP;
  let body = readFileSync(file);
  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
    if (!gzCache.has(file)) gzCache.set(file, gzipSync(body, { level: 9 }));
    body = gzCache.get(file);
    headers['content-encoding'] = 'gzip';
    headers.vary = 'Accept-Encoding';
  }
  headers['content-length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(PORT, '127.0.0.1', () =>
  console.log(`e2e static server on http://127.0.0.1:${PORT} (${ROOT})${CSP ? ' with the render.yaml CSP' : ''}`),
);
