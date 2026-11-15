#!/usr/bin/env node
// Static server for the e2e suite (T-044). Owner: qa-demo-engineer. Node built-ins only (no dependency).
// Serves the production build app/dist with gzip, the way a static host (Render Static Site) would, so the
// throttled runs measure compressed transfers. Unknown paths fall back to index.html (hash navigation needs none,
// but a judge may open "/" with any path). Usage: node tests/e2e/serve.mjs [port]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app', 'dist');
const PORT = Number(process.argv[2] ?? process.env.E2E_PORT ?? 4173);

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
}).listen(PORT, '127.0.0.1', () => console.log(`e2e static server on http://127.0.0.1:${PORT} (${ROOT})`));
