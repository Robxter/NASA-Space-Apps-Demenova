// Motion, block 5 (D-038): Roberto relaxed the One Moment Rule; Rule zero, reduced motion, accessibility and the budgets
// stay. These tests sample the page every animation frame, so they read what a viewer sees mid-animation:
// - no data number ever shows a value that is not in the snapshots (no count-up, no tween), and every row keeps its level
//   colour AND word in every frame, while the replay plays and through a route transition;
// - no layout shift from the motion (CLS from the Layout Instability API);
// - first paint: no visible text waits more than ~300 ms for its entrance;
// - reduced motion: no running animation and nothing hidden; Reveal sections all visible;
// - the Welcome hero's ambient loops pause off screen.
import { card, expect, numbersWithoutOrigin, open, slider, t, test } from '../lib/app';
import { bannerUnit, DEMO_DAY, fmt, LEVEL_WORDS, lotName, lotUnits, lots, replayDays } from '../lib/demo';
import type { Page } from '@playwright/test';

const WORD_TO_LEVEL = Object.fromEntries(Object.entries(LEVEL_WORDS.en).map(([lvl, w]) => [w, lvl]));

/** Starts a per-frame sampler of the Home lot rows and the status card; returns the samples when stopped. */
async function startHomeSampler(page: Page, names: string[]) {
  await page.evaluate((lotNames) => {
    const w = window as unknown as { __samples: unknown[]; __stop: boolean };
    w.__samples = [];
    w.__stop = false;
    const tick = () => {
      const lists = [...document.querySelectorAll('main section')].filter((s) => s.querySelector('li'));
      for (const li of document.querySelectorAll('main li')) {
        const text = (li as HTMLElement).textContent ?? '';
        const name = lotNames.filter((n) => text.includes(n)).sort((a, b) => b.length - a.length)[0];
        if (!name) continue;
        const word = li.querySelector('[data-level]:not([aria-hidden="true"])');
        const core = li.querySelector('[data-level][aria-hidden="true"]');
        const num = li.querySelector('.dn-num');
        w.__samples.push({
          kind: 'row',
          name,
          word: word?.textContent?.trim() ?? null,
          wordLevel: word?.getAttribute('data-level') ?? null,
          coreLevel: core?.getAttribute('data-level') ?? null,
          w: num ? (num as HTMLElement).innerText.trim() : null,
        });
      }
      for (const el of document.querySelectorAll('main .dn-num')) {
        if (el.closest('li') && lists.length) continue;
        const prev = el.previousElementSibling;
        if (prev?.hasAttribute('data-level')) w.__samples.push({ kind: 'tally', level: prev.getAttribute('data-level'), n: (el as HTMLElement).innerText.trim() });
      }
      if (!w.__stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, names);
}

async function stopSampler(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __samples: Record<string, string | null>[]; __stop: boolean };
    w.__stop = true;
    return w.__samples;
  });
}

/** Sum of layout-shift values without recent input since the observer started. */
async function startCls(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
        if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: false });
  });
}
const readCls = (page: Page) => page.evaluate(() => (window as unknown as { __cls: number }).__cls);

test('playing the replay: every frame shows snapshot values only, level colour and word agree, no layout shift', async ({ page }, info) => {
  test.skip(!['android-360', 'desktop-1440'].includes(info.project.name), 'sampling on one phone and one desktop');
  const start = '2026-02-04';
  await page.goto(`/#home?d=${start}`);
  await page.reload();
  await expect(slider(page)).toHaveValue(String(replayDays().indexOf(start)));
  await page.waitForTimeout(600); // first-view entrance done
  await startCls(page);
  await startHomeSampler(page, lots.map((l) => l.name));
  await page.getByRole('button', { name: t('en', 'replay.play') }).click();
  await page.waitForTimeout(4600); // three or four played days, with the FLIP reorder of 7 Feb inside
  await page.getByRole('button', { name: t('en', 'replay.pause') }).click();
  await page.waitForTimeout(400);
  const samples = await stopSampler(page);
  const cls = await readCls(page);
  const end = Number(await slider(page).inputValue());
  const days = replayDays().slice(replayDays().indexOf(start), end + 1);
  expect(days.length, 'the replay advanced').toBeGreaterThan(2);

  // Allowed values: what the snapshots hold for the days that were on screen.
  const allowedW = new Map<string, Set<string>>();
  const allowedTally = new Map<string, Set<string>>();
  for (const d of days)
    for (const u of lotUnits(d)) {
      const name = lotName(u.unit_id);
      if (u.alert.w !== null) allowedW.set(name, (allowedW.get(name) ?? new Set()).add(fmt(u.alert.w, 2)));
    }
  for (const d of days)
    for (const level of ['normal', 'watch', 'warning', 'severe', 'stale'])
      allowedTally.set(level, (allowedTally.get(level) ?? new Set()).add(String(lotUnits(d).filter((u) => u.alert.level === level).length)));

  const bad: string[] = [];
  let rows = 0;
  for (const s of samples) {
    if (s.kind === 'row') {
      rows++;
      if (s.w !== null && !allowedW.get(s.name!)?.has(s.w!)) bad.push(`${s.name}: W "${s.w}" is not a snapshot value`);
      if (!s.word || WORD_TO_LEVEL[s.word] !== s.wordLevel) bad.push(`${s.name}: word "${s.word}" with colour ${s.wordLevel}`);
      if (s.coreLevel !== s.wordLevel) bad.push(`${s.name}: core ${s.coreLevel} vs word ${s.wordLevel}`);
    } else if (!allowedTally.get(s.level!)?.has(s.n!)) bad.push(`tally ${s.level}: "${s.n}" is not a snapshot count`);
  }
  expect(rows, 'frames sampled').toBeGreaterThan(100);
  expect([...new Set(bad)]).toEqual([]);
  console.log(`[cls] ${test.info().project.name} playing: ${cls.toFixed(4)} over ${rows} row frames, days ${days[0]}..${days.at(-1)}`);
  expect(cls, 'cumulative layout shift while playing').toBeLessThan(0.1);
  expect((await numbersWithoutOrigin(page)).offenders).toEqual([]);
});

test('route transition Home -> Lot: the W and the level word are final in every frame; no layout shift', async ({ page }, info) => {
  test.skip(!['android-360', 'desktop-1440'].includes(info.project.name), 'sampling on one phone and one desktop');
  const unit = bannerUnit(DEMO_DAY)!;
  await open(page);
  await page.waitForTimeout(600);
  await startCls(page);
  await page.evaluate(() => {
    const w = window as unknown as { __lot: { w: string | null; word: string | null; level: string | null }[]; __stopLot: boolean };
    w.__lot = [];
    w.__stopLot = false;
    const tick = () => {
      if (location.hash.startsWith('#lot/')) {
        const label = [...document.querySelectorAll('main span[title]')].find((s) => s.textContent?.includes('Index W'));
        const num = label?.querySelector('.dn-num');
        const word = document.querySelector('header [data-level]:not([aria-hidden="true"])');
        w.__lot.push({ w: num ? (num as HTMLElement).innerText.trim() : null, word: word?.textContent?.trim() ?? null, level: word?.getAttribute('data-level') ?? null });
      }
      if (!w.__stopLot) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await card(page, t('en', 'home.lots')).getByRole('listitem').filter({ hasText: lotName(unit.unit_id) }).getByRole('button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(lotName(unit.unit_id));
  await page.waitForTimeout(900);
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __lot: { w: string | null; word: string | null; level: string | null }[]; __stopLot: boolean };
    w.__stopLot = true;
    return w.__lot;
  });
  expect(frames.length).toBeGreaterThan(10);
  const wants = fmt(unit.alert.w!, 2);
  const wrong = frames.filter(
    (f) => (f.w !== null && f.w !== wants) || (f.word !== null && (f.word !== LEVEL_WORDS.en[unit.alert.level] || f.level !== unit.alert.level)),
  );
  expect(wrong, `W stays ${wants} and the word stays ${LEVEL_WORDS.en[unit.alert.level]}`).toEqual([]);
  const routeCls = await readCls(page);
  console.log(`[cls] ${test.info().project.name} route Home->Lot: ${routeCls.toFixed(4)} over ${frames.length} frames`);
  expect(routeCls, 'cumulative layout shift of the route change').toBeLessThan(0.1);
  expect((await numbersWithoutOrigin(page)).offenders).toEqual([]);
});

/**
 * First paint, measured exactly (frame sampling is too coarse: a long task on load can delay frames by 200 ms or more).
 * Every opacity-from-0 animation that runs in the first 1.5 s on an element visible at that moment is collected; its
 * curve is replayed on a hidden probe (same keyframes and timing) and searched for the moment it crosses 50 % opacity.
 * The gate is that moment, delay included. Then, after 1 s, every visible text element must be fully opaque.
 */
async function firstPaintGates(page: Page, hash: string, ready: () => Promise<void>) {
  await page.addInitScript(() => {
    const w = window as unknown as { __anims: Set<Animation>; __animStop: boolean };
    w.__anims = new Set();
    w.__animStop = false;
    const t0 = performance.now();
    const tick = () => {
      for (const a of document.getAnimations()) {
        const target = (a.effect as KeyframeEffect | null)?.target as Element | null;
        if (!target) continue;
        const r = target.getBoundingClientRect();
        if (r.width && r.height && r.top < innerHeight && r.bottom > 0) w.__anims.add(a);
      }
      if (performance.now() - t0 < 1500 && !w.__animStop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(`/${hash}`);
  await ready();
  await page.waitForTimeout(1600);
  // Under CPU load an entrance can start late; the stuck check below runs once every finite animation has ended.
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length,
        ),
      { timeout: 5000 },
    )
    .toBe(0);
  return page.evaluate(() => {
    const w = window as unknown as { __anims: Set<Animation> };
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px';
    document.body.appendChild(probe);
    const gates: { what: string; gate: number }[] = [];
    for (const a of w.__anims) {
      const effect = a.effect as KeyframeEffect;
      const frames = effect.getKeyframes();
      if (!frames.length || String(frames[0]!.opacity ?? '') !== '0') continue;
      const timing = effect.getTiming();
      if (timing.iterations === Infinity) continue; // ambient loops are not entrances
      const dur = Number(timing.duration) || 0;
      const delay = Number(timing.delay) || 0;
      const copy = new Animation(new KeyframeEffect(probe, frames, { ...timing, delay: 0, fill: 'both', iterations: 1 }));
      copy.pause();
      const opacityAt = (t: number) => {
        copy.currentTime = t;
        return Number(getComputedStyle(probe).opacity);
      };
      let lo = 0;
      let hi = dur;
      if (opacityAt(hi) < 0.5) continue;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (opacityAt(mid) >= 0.5) hi = mid;
        else lo = mid;
      }
      copy.cancel();
      const target = effect.target as HTMLElement;
      gates.push({ what: `${(a as CSSAnimation).animationName ?? 'script'} "${(target.innerText ?? '').trim().slice(0, 30)}"`, gate: Math.round(delay + hi) });
    }
    probe.remove();
    const effective = (el: Element) => {
      let o = 1;
      for (let x: Element | null = el; x; x = x.parentElement) o *= Number(getComputedStyle(x).opacity);
      return o;
    };
    const stuck = [...document.querySelectorAll('h1, h2, h3, p, li, button, a, [data-level]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width && r.height && r.top < innerHeight && r.bottom > 0 && (el as HTMLElement).innerText?.trim();
      })
      .filter((el) => !el.closest('[disabled], .dn-reveal-pending') && effective(el) < 0.95)
      .map((el) => {
        let low = '';
        let lowest = 1;
        for (let x: Element | null = el; x; x = x.parentElement) {
          const o = Number(getComputedStyle(x).opacity);
          if (o < lowest) [lowest, low] = [o, `${x.tagName.toLowerCase()}.${x.className.toString().slice(0, 40)} ${o}`];
        }
        const r = el.getBoundingClientRect();
        return `${(el as HTMLElement).innerText.trim().slice(0, 24)} (top ${Math.round(r.top)}/${innerHeight}; ${low}; anims ${document.getAnimations().length})`;
      });
    return { gates, stuck };
  });
}

const ROUTES: { hash: string; ready: (p: Page) => Promise<void> }[] = [
  { hash: '#welcome', ready: (p) => expect(p.getByTestId('welcome-app-access').first()).toBeVisible() },
  { hash: '#home', ready: (p) => expect(slider(p)).toBeVisible() },
  { hash: '#map', ready: (p) => expect(p.locator('path.leaflet-interactive').first()).toBeVisible() },
  { hash: `#lot/${encodeURIComponent(bannerUnit(DEMO_DAY)!.unit_id)}`, ready: (p) => expect(p.getByRole('heading', { level: 1 })).toBeVisible() },
  { hash: '#alerts', ready: (p) => expect(slider(p)).toBeVisible() },
];

for (const r of ROUTES) {
  test(`first paint of ${r.hash}: no visible text waits more than ~300 ms for its entrance`, async ({ page }) => {
    const { gates, stuck } = await firstPaintGates(page, r.hash, () => r.ready(page));
    const max = Math.max(0, ...gates.map((g) => g.gate));
    test.info().annotations.push({ type: 'slowest entrance to 50 % opacity', description: `${max} ms over ${gates.length} animations` });
    console.log(`[gate] ${test.info().project.name} ${r.hash}: slowest ${max} ms over ${gates.length} entrance animations`);
    expect(gates.filter((g) => g.gate > 300).map((g) => `${g.what} ${g.gate} ms`), 'entrances that keep text under 50 % past 300 ms').toEqual([]);
    expect(stuck, 'visible text not fully shown after the entrances').toEqual([]);
  });
}

test.describe('reduced motion', () => {
  for (const r of ROUTES) {
    test(`${r.hash}: no running animation and nothing hidden, also below the fold`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${r.hash}`);
      await r.ready(page);
      await page.waitForTimeout(800);
      const state = await page.evaluate(() => {
        const running = document
          .getAnimations()
          .filter((a) => a.playState === 'running')
          .map((a) => `${(a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'script'} on ${((a.effect as KeyframeEffect)?.target as Element)?.className?.toString().slice(0, 40)}`);
        const effective = (el: Element) => {
          let o = 1;
          for (let a: Element | null = el; a; a = a.parentElement) o *= Number(getComputedStyle(a).opacity);
          return o;
        };
        const hidden = [...document.querySelectorAll('h1, h2, h3, p, li, figure, section, [data-testid]')]
          .filter((el) => (el as HTMLElement).innerText?.trim() || el.getAttribute('data-testid'))
          .filter((el) => el.getClientRects().length && effective(el) < 0.3)
          .map((el) => ((el as HTMLElement).innerText || el.getAttribute('data-testid') || '').trim().slice(0, 40));
        return { running, hidden, pending: document.querySelectorAll('.dn-reveal-pending').length };
      });
      expect(state.running, 'running animations').toEqual([]);
      expect(state.hidden, 'elements hidden by opacity').toEqual([]);
      expect(state.pending, 'Reveal sections left pending').toBe(0);
    });
  }
});

test('Welcome: every Reveal section appears once scrolled to, and the hero loops pause off screen', async ({ page }) => {
  await page.goto('/#welcome');
  await expect(page.getByTestId('welcome-hero-art')).toBeVisible();
  await page.waitForTimeout(700);
  const loops = () =>
    page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => ['dn-orbit', 'dn-rain', 'dn-wave'].includes((a as CSSAnimation).animationName))
        .map((a) => a.playState),
    );
  const atTop = await loops();
  expect(atTop.length, 'ambient loops exist on the hero').toBeGreaterThan(0);
  expect(atTop.every((s) => s === 'running'), 'loops run while the hero is on screen').toBe(true);

  // Scroll down step by step: each Reveal section arrives; nothing stays pending.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 300) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(900);
  expect(await page.locator('.dn-reveal-pending').count(), 'Reveal sections left pending').toBe(0);
  await expect(page.getByTestId('welcome-how')).toBeVisible();
  const notShown = await page.evaluate(() =>
    [...document.querySelectorAll('.dn-reveal-in')].filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
  );
  expect(notShown, 'revealed sections end fully opaque').toBe(0);

  // The hero is now off screen: its loops are paused (they cost nothing).
  const hero = (await page.getByTestId('welcome-hero-art').boundingBox())!;
  const vh = page.viewportSize()!.height;
  test.skip(hero.y + hero.height > 0 && hero.y < vh, 'page too short to scroll the hero away at this viewport');
  const below = await loops();
  expect(below.length).toBeGreaterThan(0);
  expect(below.every((s) => s === 'paused'), `loops off screen: ${below.join(',')}`).toBe(true);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await loops()).every((s) => s === 'running')).toBe(true);
});
