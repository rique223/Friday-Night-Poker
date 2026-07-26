import type { ErrorCode } from '@fnp/shared';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

/**
 * Q80: the dictionaries used to live inline in `PreferencesContext.tsx`, with a
 * hand-maintained `TranslationKeys` interface listing all 74 keys a second time in
 * `types/index.ts` — so adding one string meant editing four places.
 *
 * `pt` is the source of truth (it is the default locale) and the key type is *derived*
 * from it, so a missing or misspelled key in `en`/`es` is a compile error rather than a
 * silent fallback to the raw key at runtime.
 */
export type TranslationKey = keyof typeof pt;
export type Dictionary = Record<TranslationKey, string>;

export const LANGUAGES = ['pt', 'en', 'es'] as const;
export type Language = (typeof LANGUAGES)[number];

export const CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const dictionaries: Record<Language, Dictionary> = { pt, en, es };

export const LOCALE_TAGS: Record<Language, string> = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
};

/** Server error codes map onto translation keys by convention (Q71). */
export function errorKeyFor(code: ErrorCode | 'NETWORK'): TranslationKey {
    const key = `error_${code}` as TranslationKey;
    return key in pt ? key : 'error_INTERNAL_ERROR';
}

export function isLanguage(value: unknown): value is Language {
    return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function isCurrency(value: unknown): value is Currency {
    return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}
