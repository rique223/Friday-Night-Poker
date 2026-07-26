import { memo } from 'react';

import { usePreferences } from '../contexts/PreferencesContext';
import { CURRENCIES, type Currency, type Language, LANGUAGES } from '../i18n';

import { Select } from './ui';

const LANGUAGE_LABELS: Record<Language, string> = { pt: 'PT-BR', en: 'EN', es: 'ES' };

const LangCurrencySwitcher = memo(function LangCurrencySwitcher() {
    const { lang, setLang, currency, setCurrency, t } = usePreferences();

    const currencyLabels: Record<Currency, string> = {
        BRL: t('currencyBRL'),
        USD: t('currencyUSD'),
        EUR: t('currencyEUR'),
    };

    return (
        <div className="flex items-center gap-2">
            <Select
                // Q81: these `aria-label`s were hardcoded English.
                aria-label={t('language')}
                value={lang}
                onChange={event => setLang(event.target.value as Language)}
                options={LANGUAGES.map(value => ({ value, label: LANGUAGE_LABELS[value] }))}
                className="flex-1"
            />
            <Select
                aria-label={t('currency')}
                value={currency}
                onChange={event => setCurrency(event.target.value as Currency)}
                options={CURRENCIES.map(value => ({ value, label: currencyLabels[value] }))}
                className="flex-1"
            />
        </div>
    );
});

export default LangCurrencySwitcher;
