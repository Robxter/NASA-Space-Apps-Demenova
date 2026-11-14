import { describe, expect, it } from 'vitest';
import { SEVERITY_WORDS } from '../components/ui/severity';
import { FACTOR_NAME_VALUES, ORIGIN_VALUES, SEVERITY_VALUES } from '../types/contracts';
import { detectLanguage, translate } from './index';
import { en } from './en';
import { es } from './es';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionaries', () => {
  it('have exactly the same keys in English and Spanish', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('have no empty strings and the same placeholders per key', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(en[key].trim(), key).not.toBe('');
      expect(es[key].trim(), key).not.toBe('');
      expect(placeholders(es[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('use the fixed severity words (CLAUDE.md §2) and agree with the ui kit', () => {
    const fixed = {
      en: { normal: 'Normal', watch: 'Watch', warning: 'Warning', severe: 'Severe' },
      es: { normal: 'Normal', watch: 'Vigilancia', warning: 'Aviso', severe: 'Severo' },
    } as const;
    for (const lang of ['en', 'es'] as const) {
      for (const level of SEVERITY_VALUES) {
        const word = translate(lang, `level.${level}`);
        if (level !== 'stale') expect(word).toBe(fixed[lang][level]);
        expect(word).toBe(SEVERITY_WORDS[lang][level]);
      }
    }
  });

  it('cover every contract origin and factor name', () => {
    for (const o of ORIGIN_VALUES) expect(en).toHaveProperty(`origin.${o}`);
    for (const f of FACTOR_NAME_VALUES) expect(en).toHaveProperty(`factor.${f}`);
  });

  it('credit NASA in words without implying endorsement', () => {
    expect(en['app.credit']).toBe('Built with NASA Earth observations');
  });
});

describe('translate', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(translate('en', 'common.updated', { time: '22/02/2026 10:00' })).toBe('Updated 22/02/2026 10:00');
    expect(translate('es', 'common.updated')).toBe('Actualizado {time}');
  });

  it('detects the starting language', () => {
    expect(detectLanguage('es-EC')).toBe('es');
    expect(detectLanguage('en-GB')).toBe('en');
    expect(detectLanguage(undefined)).toBe('en');
  });
});
