import { useState } from 'react';
import { toCents } from '@fnp/shared';

import { STORAGE_KEYS } from '../../constants';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useForm } from '../../hooks/useForm';
import { Button, Input } from '../ui';

interface AddPlayerFormProps {
    onSubmit: (payload: { name: string; initialBuyInCents: number }) => Promise<void>;
    disabled?: boolean;
    /**
     * Setup mode already asks "who's at the table?" above this form, so repeating
     * "Add player" directly underneath is one heading doing no work.
     */
    showTitle?: boolean;
}

interface Values extends Record<string, unknown> {
    name: string;
    initialBuyIn: string;
}

export default function AddPlayerForm({
    onSubmit,
    disabled = false,
    showTitle = true,
}: AddPlayerFormProps) {
    const { t } = usePreferences();

    /**
     * Q60: the remembered buy-in used to be read from localStorage *during render* by the
     * parent and baked into `initialValues` at mount — but the component never remounts
     * and `reset()` restored those same original values, so "remember my last buy-in"
     * only took effect after a full page reload. It is state here, and `reset` is given
     * the new value explicitly.
     */
    const [lastBuyIn, setLastBuyIn] = useState(
        () => localStorage.getItem(STORAGE_KEYS.lastInitialBuyIn) ?? '',
    );

    const { errors, isSubmitting, handleSubmit, getFieldProps, reset } = useForm<Values>({
        initialValues: { name: '', initialBuyIn: lastBuyIn },
        onSubmit: async values => {
            await onSubmit({
                name: values.name.trim(),
                initialBuyInCents: toCents(values.initialBuyIn),
            });
            localStorage.setItem(STORAGE_KEYS.lastInitialBuyIn, values.initialBuyIn);
            setLastBuyIn(values.initialBuyIn);
            reset({ name: '', initialBuyIn: values.initialBuyIn });
            document.getElementById('add-player-name')?.focus();
        },
        validate: values => {
            const result: Partial<Record<keyof Values, string>> = {};
            // Q81: these messages were hardcoded English, shown to a Portuguese default UI.
            if (!values.name.trim()) result.name = t('nameRequired');
            if (!(toCents(values.initialBuyIn) > 0)) {
                result.initialBuyIn = t('initialBuyInPositive');
            }
            return result;
        },
    });

    return (
        <section className="card p-5">
            {showTitle && <h2 className="font-semibold mb-3">{t('addPlayer')}</h2>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <div className="flex flex-row gap-2">
                    <Input
                        id="add-player-name"
                        label={t('name')}
                        placeholder={t('name')}
                        className="flex-1 basis-0 min-w-0"
                        disabled={disabled}
                        {...getFieldProps('name')}
                    />
                    {/* Q61: the old version spread a React synthetic event and faked
                        `target` to smuggle a number through a string handler, with an
                        `as any` and a second `getFieldProps()` call inside the handler.
                        The field is simply a string now, converted to cents on submit. */}
                    <Input
                        id="add-player-buy-in"
                        label={t('initialBuyIn')}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder={t('initialBuyIn')}
                        className="flex-1 basis-0 min-w-0"
                        disabled={disabled}
                        {...getFieldProps('initialBuyIn')}
                        error={errors.initialBuyIn}
                    />
                </div>
                <Button type="submit" loading={isSubmitting} disabled={disabled} className="w-full">
                    {t('add')}
                </Button>
            </form>
        </section>
    );
}
