import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { fromCents } from '@fnp/shared';

import { STORAGE_KEYS } from '../constants';
import {
    type Currency,
    dictionaries,
    isCurrency,
    isLanguage,
    type Language,
    LOCALE_TAGS,
    type TranslationKey,
} from '../i18n';

export type Theme = 'dark' | 'light';

interface PreferencesValue {
    lang: Language;
    setLang: (lang: Language) => void;
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    theme: Theme;
    toggleTheme: () => void;
    t: (key: TranslationKey) => string;
    /** Formats an integer-cent amount for display. */
    formatCurrency: (cents: number) => string;
    formatDateTime: (iso: string) => string;
    /** The weekday-led label a night is actually remembered by, e.g. "sex., 25 de jul.". */
    formatSessionDate: (iso: string) => string;
    formatGroupLabel: (startDate: string, groupBy: 'week' | 'month' | 'year') => string;
}

const PreferencesContext = createContext<PreferencesValue | undefined>(undefined);

/**
 * Reads the persisted theme, tolerating anything unexpected in storage.
 *
 * Q84 confirmed the three separate keys are intended, so they stay — but an unreadable
 * value now falls back instead of leaving `dictionaries[lang]` undefined and making
 * `t()` throw on every render, which showed as a white screen.
 */
function readTheme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEYS.theme);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Language>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.lang);
        return isLanguage(stored) ? stored : 'pt';
    });
    const [currency, setCurrency] = useState<Currency>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.currency);
        return isCurrency(stored) ? stored : 'BRL';
    });
    // Q56: theme lives here rather than in `ThemeToggle`'s own `useState`. Two toggles are
    // mounted at once on some pages (one hidden by a breakpoint, not unmounted), so
    // per-instance state meant clicking one left the other showing the wrong icon, and its
    // first click was a visual no-op.
    const [theme, setTheme] = useState<Theme>(readTheme);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.lang, lang);
    }, [lang]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.currency, currency);
    }, [currency]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEYS.theme, theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(current => (current === 'dark' ? 'light' : 'dark'));
    }, []);

    // Q72: `t` used to be redefined on every render *and* be a dependency of the context
    // `useMemo`, so the memo never hit and every consumer re-rendered whenever the
    // provider did — which also defeated `memo()` on PlayerCard (Q94).
    const t = useCallback((key: TranslationKey) => dictionaries[lang][key] || key, [lang]);

    const formatCurrency = useCallback(
        (cents: number) =>
            new Intl.NumberFormat(LOCALE_TAGS[lang], { style: 'currency', currency }).format(
                fromCents(cents),
            ),
        [lang, currency],
    );

    const formatDateTime = useCallback(
        (iso: string) =>
            new Intl.DateTimeFormat(LOCALE_TAGS[lang], {
                dateStyle: 'short',
                timeStyle: 'short',
            }).format(new Date(iso)),
        [lang],
    );

    // Nobody refers to a night by its database id. "sex., 25 de jul." is how the game is
    // remembered, so it leads the session header and `#id` drops to a subtitle.
    const formatSessionDate = useCallback(
        (iso: string) =>
            new Intl.DateTimeFormat(LOCALE_TAGS[lang], {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
            }).format(new Date(iso)),
        [lang],
    );

    const formatGroupLabel = useCallback(
        (startDate: string, groupBy: 'week' | 'month' | 'year') => {
            // The server sends a plain calendar date; parsing it as UTC keeps it from
            // sliding a day backwards for viewers west of Greenwich.
            const date = new Date(`${startDate}T00:00:00Z`);
            const options: Intl.DateTimeFormatOptions =
                groupBy === 'year'
                    ? { year: 'numeric', timeZone: 'UTC' }
                    : groupBy === 'month'
                      ? { year: 'numeric', month: 'long', timeZone: 'UTC' }
                      : { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' };
            return new Intl.DateTimeFormat(LOCALE_TAGS[lang], options).format(date);
        },
        [lang],
    );

    const value = useMemo(
        () => ({
            lang,
            setLang,
            currency,
            setCurrency,
            theme,
            toggleTheme,
            t,
            formatCurrency,
            formatDateTime,
            formatSessionDate,
            formatGroupLabel,
        }),
        [
            lang,
            currency,
            theme,
            toggleTheme,
            t,
            formatCurrency,
            formatDateTime,
            formatSessionDate,
            formatGroupLabel,
        ],
    );

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
    const ctx = useContext(PreferencesContext);
    if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
    return ctx;
}
