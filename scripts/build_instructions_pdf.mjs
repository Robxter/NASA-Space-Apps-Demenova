// Builds app/public/Instructions.pdf from docs/site/Instructions.md with the headless Edge already used by the e2e
// suite (no new dependency). Screenshot placeholders "[SCREENSHOT: <name>]" are replaced by images listed in
// docs/site/screenshots.json ({ "<name>": "path/to.png" }); a missing image keeps a visible placeholder box.
// Usage (PowerShell): $env:Path = 'C:\Program Files\nodejs;' + $env:Path; node scripts/build_instructions_pdf.mjs
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(ROOT, 'tests', 'e2e', 'package.json'));
const { chromium } = require('@playwright/test');

const md = readFileSync(join(ROOT, 'docs', 'site', 'Instructions.md'), 'utf-8').replace(/^\uFEFF/, '');
const shotsFile = join(ROOT, 'docs', 'site', 'screenshots.json');
const shots = existsSync(shotsFile) ? JSON.parse(readFileSync(shotsFile, 'utf-8')) : {};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');

function toHtml(text) {
  const out = [];
  let list = null;
  let para = [];
  let table = null;
  const flush = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
    if (list) { out.push(`</${list}>`); list = null; }
    if (table) { out.push('</tbody></table>'); table = null; }
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const shot = line.match(/^\[SCREENSHOT:\s*(.+?)\]$/);
    if (shot) {
      flush();
      const file = shots[shot[1]];
      if (file && existsSync(join(ROOT, file))) {
        const data = readFileSync(join(ROOT, file)).toString('base64');
        out.push(`<figure><img src="data:image/png;base64,${data}" alt="${esc(shot[1])}"><figcaption>${esc(shot[1])}</figcaption></figure>`);
      } else {
        out.push(`<div class="shot-missing">Screenshot: ${esc(shot[1])}</div>`);
      }
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flush(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^\|/.test(line)) {
      const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
      if (!table) { flush(); out.push(`<table><thead><tr>${cells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>`); table = true; continue; }
      out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
      continue;
    }
    const li = line.match(/^\s*(?:[-*]|(\d+)\.)\s+(.*)$/);
    if (li) {
      if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
      const kind = li[1] ? 'ol' : 'ul';
      if (list !== kind) { if (list) out.push(`</${list}>`); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(li[2])}</li>`);
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    if (list && /^\s{2,}/.test(raw)) { out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ` ${inline(line.trim())}</li>`); continue; }
    para.push(line.trim());
  }
  flush();
  return out.join('\n');
}

const css = `
  @page { size: A4; margin: 18mm 16mm 20mm; }
  body { font-family: "Segoe UI", Roboto, Arial, sans-serif; color: #0e2135; font-size: 10.5pt; line-height: 1.5; }
  h1 { font-size: 22pt; margin: 0 0 6pt; font-weight: 600; }
  h2 { font-size: 15pt; margin: 18pt 0 6pt; padding-top: 6pt; border-top: 1px solid #d2dbd6; break-after: avoid; }
  h3 { font-size: 12pt; margin: 12pt 0 4pt; break-after: avoid; }
  p, li { margin: 0 0 6pt; } ul, ol { padding-left: 18pt; margin: 0 0 8pt; }
  code { font-family: Consolas, monospace; font-size: 9.5pt; background: #eef2ef; padding: 0 2pt; border-radius: 2pt; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 9.5pt; }
  th, td { border: 1px solid #d2dbd6; padding: 3pt 5pt; text-align: left; vertical-align: top; }
  th { background: #eef2ef; }
  figure { margin: 8pt 0 12pt; text-align: center; break-inside: avoid; }
  figure img { max-width: 62%; max-height: 120mm; border: 1px solid #d2dbd6; border-radius: 6pt; }
  figcaption { font-size: 8.5pt; color: #44566a; margin-top: 3pt; }
  .shot-missing { border: 1px dashed #8e9dab; color: #44566a; padding: 10pt; margin: 8pt 0; text-align: center; font-size: 9pt; }
  a { color: #2a6343; }`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Demenova — Instructions</title><style>${css}</style></head><body>${toHtml(md)}</body></html>`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const out = join(ROOT, 'app', 'public', 'Instructions.pdf');
await page.pdf({
  path: out, format: 'A4', printBackground: true, displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8pt;width:100%;text-align:center;color:#56677a">Demenova — Instructions · page <span class="pageNumber"></span> of <span class="totalPages"></span> · Built with NASA Earth observations</div>',
  margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
});
await browser.close();
console.log('wrote', out);
