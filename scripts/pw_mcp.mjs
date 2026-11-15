// Bridge to the Playwright MCP server (@playwright/mcp) for agents whose session did not load it as a tool.
// Starts the server over stdio, runs a list of MCP tool calls in ONE browser session, prints the results.
//
//   node scripts/pw_mcp.mjs --list-tools
//   node scripts/pw_mcp.mjs steps.json [--max-chars 1500] [-- <extra server flags, e.g. --device "iPhone 15">]
//
// steps.json: [{ "tool": "browser_navigate", "args": { "url": "http://127.0.0.1:4173/" } },
//              { "tool": "browser_resize", "args": { "width": 360, "height": 780 } },
//              { "tool": "browser_snapshot", "args": {}, "save": "out/home.a11y.txt" },
//              { "tool": "browser_take_screenshot", "args": { "fullPage": true }, "save": "out/home.png" }]
// "save" writes the step's full text (or its image) to that path; stdout shows text cut to --max-chars.
// Server location: PLAYWRIGHT_MCP_CLI, else ~/.claude/mcp-servers/playwright-mcp (docs/DESIGN_TOOLS.md).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const dash = argv.indexOf('--');
const own = dash === -1 ? argv : argv.slice(0, dash);
const extra = dash === -1 ? [] : argv.slice(dash + 1);
const listOnly = own.includes('--list-tools');
const mc = own.indexOf('--max-chars');
const maxChars = mc === -1 ? 1500 : Number(own[mc + 1]);
const stepsPath = own.find((a, i) => !a.startsWith('--') && (mc === -1 || i !== mc + 1));

const cli = process.env.PLAYWRIGHT_MCP_CLI
  ?? join(homedir(), '.claude', 'mcp-servers', 'playwright-mcp', 'node_modules', '@playwright', 'mcp', 'cli.js');
if (!existsSync(cli)) {
  console.error(`Playwright MCP not found at ${cli}. See docs/DESIGN_TOOLS.md.`);
  process.exit(2);
}
if (!listOnly && !stepsPath) {
  console.error('usage: node scripts/pw_mcp.mjs steps.json | --list-tools');
  process.exit(2);
}
// PowerShell writes UTF-8 with a byte-order mark; JSON.parse rejects it.
const steps = listOnly ? [] : JSON.parse(readFileSync(stepsPath, 'utf-8').replace(/^﻿/, ''));

// The server writes its own snapshot and screenshot files; keep them out of the repo unless a flag says otherwise.
const outDir = extra.includes('--output-dir') ? [] : ['--output-dir', join(tmpdir(), 'playwright-mcp-out')];
const server = spawn(process.execPath, [cli, '--browser', 'msedge', '--headless', '--isolated', ...outDir, ...extra],
  { stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true });
let buffer = '';
let nextId = 1;
const waiting = new Map();
server.stdout.setEncoding('utf-8');
server.stdout.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id !== undefined && waiting.has(msg.id)) {
      const { resolve: ok, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message ?? JSON.stringify(msg.error))); else ok(msg.result);
    }
  }
});
server.on('exit', (code) => {
  for (const { reject } of waiting.values()) reject(new Error(`Playwright MCP server exited (${code})`));
});
const send = (obj) => server.stdin.write(JSON.stringify(obj) + '\n');
const request = (method, params) => new Promise((ok, reject) => {
  const id = nextId++;
  waiting.set(id, { resolve: ok, reject });
  send({ jsonrpc: '2.0', id, method, params });
});

let failed = 0;
try {
  await request('initialize', {
    protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'demenova-pw-bridge', version: '1.0.0' },
  });
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  if (listOnly) {
    const { tools } = await request('tools/list', {});
    for (const t of tools) console.log(`${t.name}  ${(t.description ?? '').split('\n')[0].slice(0, 110)}`);
  }
  for (const [i, step] of steps.entries()) {
    const label = `[${i + 1}/${steps.length}] ${step.tool}`;
    let result;
    try {
      result = await request('tools/call', { name: step.tool, arguments: step.args ?? {} });
    } catch (e) {
      failed++;
      console.log(`${label} ERROR: ${e.message}`);
      continue;
    }
    const texts = (result.content ?? []).filter((c) => c.type === 'text').map((c) => c.text);
    const image = (result.content ?? []).find((c) => c.type === 'image');
    const text = texts.join('\n');
    if (result.isError) failed++;
    if (step.save) {
      const out = resolve(step.save);
      mkdirSync(dirname(out), { recursive: true });
      if (image && /\.(png|jpe?g)$/i.test(out)) writeFileSync(out, Buffer.from(image.data, 'base64'));
      else writeFileSync(out, text, 'utf-8');
    }
    const shown = text.length > maxChars ? `${text.slice(0, maxChars)}\n… (${text.length - maxChars} more chars${step.save ? `, full text in ${step.save}` : ''})` : text;
    console.log(`${label}${result.isError ? ' TOOL ERROR' : ''}${step.save ? ` -> ${step.save}` : ''}\n${shown}\n`);
  }
} catch (e) {
  failed++;
  console.error(`bridge error: ${e.message}`);
} finally {
  try { await Promise.race([request('tools/call', { name: 'browser_close', arguments: {} }), new Promise((r) => setTimeout(r, 3000))]); } catch { /* closing */ }
  server.stdin.end();
  setTimeout(() => server.kill(), 500).unref();
}
process.exitCode = failed ? 1 : 0;
