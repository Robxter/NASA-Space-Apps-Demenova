// Hand-rolled i18n (no library): one dictionary per language, `{name}` placeholders.
import type { Language, Severity } from '../types/contracts';
import { en, type MessageKey } from './en';
import { es } from './es';

export type { MessageKey };
export const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { en, es };

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

export function translate(lang: Language, key: MessageKey, params?: Record<string, string | number>): string {
  const text = DICTIONARIES[lang][key] ?? DICTIONARIES.en[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

export function makeT(lang: Language): Translate {
  return (key, params) => translate(lang, key, params);
}

/** Severity words always come from the dictionary (CLAUDE.md §2). */
export function levelKey(level: Severity): MessageKey {
  return `level.${level}` as MessageKey;
}

/** Field default per SPEC 17 is Spanish; a device set to another language starts in English. */
export function detectLanguage(navLang: string | undefined): Language {
  return navLang && navLang.toLowerCase().startsWith('es') ? 'es' : 'en';
}
