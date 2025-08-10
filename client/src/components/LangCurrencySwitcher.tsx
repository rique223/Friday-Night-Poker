import { memo } from 'react';

import { usePreferences } from '../contexts/PreferencesContext';
import { Currency, Language } from '../types';

import Select from './ui/Select';

const LangCurrencySwitcher = memo(() => {
    const { lang, setLang, currency, setCurrency, t } = usePreferences();

    const languageOptions = [
        { value: 'pt', label: 'PT-BR' },
        { value: 'en', label: 'EN' },
        { value: 'es', label: 'ES' },
    ];

    const currencyOptions = [
        { value: 'BRL', label: t('currencyBRL') },
        { value: 'USD', label: t('currencyUSD') },
        { value: 'EUR', label: t('currencyEUR') },
    ];

    return (
        <div className="flex items-center gap-2">
            <Select
                aria-label="Language"
                value={lang}
                onChange={e => setLang(e.target.value as Language)}
                options={languageOptions}
                className="flex-1"
            />
            <Select
                aria-label="Currency"
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                options={currencyOptions}
                className="flex-1"
            />
        </div>
    );
});

export default LangCurrencySwitcher;
