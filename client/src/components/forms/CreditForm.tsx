import type { Player } from '@fnp/shared';
import { toCents } from '@fnp/shared';

import { usePreferences } from '../../contexts/PreferencesContext';
import { useForm } from '../../hooks/useForm';
import { Button, Input, Select } from '../ui';

interface CreditFormProps {
    onSubmit: (payload: {
        providerId: number;
        receiverId: number;
        amountCents: number;
    }) => Promise<void>;
    players: Player[];
}

interface Values extends Record<string, unknown> {
    providerId: string;
    receiverId: string;
    amount: string;
}

export default function CreditForm({ onSubmit, players }: CreditFormProps) {
    const { t } = usePreferences();
    const options = players
        .filter(player => player.isActive)
        .map(player => ({ value: String(player.id), label: player.name }));

    const { isSubmitting, handleSubmit, getFieldProps } = useForm<Values>({
        initialValues: { providerId: '', receiverId: '', amount: '' },
        onSubmit: values =>
            onSubmit({
                providerId: Number(values.providerId),
                receiverId: Number(values.receiverId),
                amountCents: toCents(values.amount),
            }),
        validate: values => {
            const result: Partial<Record<keyof Values, string>> = {};
            if (!values.providerId) result.providerId = t('providerRequired');
            if (!values.receiverId) result.receiverId = t('receiverRequired');
            // The server rejects this too (Q37) — it used to be a client-only check, so a
            // direct API call corrupted the player's row.
            if (values.providerId && values.providerId === values.receiverId) {
                result.receiverId = t('sameProviderReceiver');
            }
            if (!(toCents(values.amount) > 0)) result.amount = t('amountPositive');
            return result;
        },
    });

    return (
        <form onSubmit={handleSubmit} className="grid gap-3">
            <Select
                label={t('provider')}
                options={options}
                placeholder={t('provider')}
                {...getFieldProps('providerId')}
            />
            <Select
                label={t('receiver')}
                options={options}
                placeholder={t('receiver')}
                {...getFieldProps('receiverId')}
            />
            <Input
                label={t('amount')}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder={t('amount')}
                {...getFieldProps('amount')}
            />
            <Button type="submit" loading={isSubmitting}>
                {t('save')}
            </Button>
        </form>
    );
}
