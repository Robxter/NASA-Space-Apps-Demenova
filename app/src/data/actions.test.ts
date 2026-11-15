// Per-level checks: picked by level and mode from actions.json, never written by the app.
import { describe, expect, it } from 'vitest';
import type { ActionEntry } from '../types/contracts';
import { ALERT_LEVEL_VALUES, MODE_VALUES } from '../types/contracts';
import { checkFor, isReviewed } from './actions';
import { guards } from './snapshots';
import demoActions from '../../public/data/demo/actions.json';
import { en } from '../i18n/en';
import { es } from '../i18n/es';

const entry = (level: ActionEntry['level'], mode: ActionEntry['mode'], es: string): ActionEntry => ({
  level,
  mode,
  text: { es, en: null },
  origin: 'estimated',
  approved_by: null,
  human_review: 'none',
});

describe('checkFor', () => {
  const list = [entry('warning', 'farmer', 'f'), entry('warning', 'agronomist', 'a'), entry('severe', 'farmer', 's')];

  it('picks the entry for the level and the mode', () => {
    expect(checkFor(list, 'warning', 'farmer')?.text?.es).toBe('f');
    expect(checkFor(list, 'warning', 'agronomist')?.text?.es).toBe('a');
  });

  it('returns nothing rather than borrowing another level or mode', () => {
    expect(checkFor(list, 'severe', 'agronomist')).toBeNull();
    expect(checkFor(list, 'watch', 'farmer')).toBeNull();
    expect(checkFor(list, 'stale', 'farmer')).toBeNull();
    expect(checkFor(list, null, 'farmer')).toBeNull();
  });

  it('treats human_review none as not reviewed', () => {
    expect(isReviewed(entry('normal', 'farmer', 'x'))).toBe(false);
    expect(isReviewed({ human_review: 'local-agronomist' })).toBe(true);
    expect(isReviewed({ approved_by: 'someone' })).toBe(true);
  });
});

describe('committed actions.json', () => {
  it('has a check in both languages for every level and mode, none reviewed by a human yet', () => {
    expect(guards.actions(demoActions)).toBe(true);
    const actions = (demoActions as { actions: ActionEntry[] }).actions;
    for (const level of ALERT_LEVEL_VALUES) {
      for (const mode of MODE_VALUES) {
        const a = checkFor(actions, level, mode);
        expect(a, `${level}/${mode}`).not.toBeNull();
        expect(a?.text?.es?.trim()).toBeTruthy();
        expect(a?.text?.en?.trim()).toBeTruthy();
        expect(isReviewed(a!)).toBe(false);
      }
    }
  });

  it('carries no wording of the app: the dictionaries only hold the title and the badge', () => {
    const texts = (demoActions as { actions: ActionEntry[] }).actions.flatMap((a) => [a.text?.es, a.text?.en]);
    const dictValues = new Set([...Object.values(en), ...Object.values(es)]);
    for (const t of texts) expect(dictValues.has(t ?? '')).toBe(false);
  });
});

describe('D-026 not-reviewed wording', () => {
  it('uses the agreed label on Learn and Strategies', () => {
    expect(en['learn.notReviewed']).toBe('General guidance — not yet reviewed by a local agronomist');
    expect(es['learn.notReviewed']).toBe('Orientación general — aún no revisada por un agrónomo local');
    expect(en['strategies.notReviewed']).toBe('Not yet reviewed by a local agronomist');
    expect(es['strategies.notReviewed']).toBe('No revisado aún por un agrónomo local');
  });
});
