import type { Player } from '@fnp/shared';
import { toCents } from '@fnp/shared';

import { usePreferences } from '../../contexts/PreferencesContext';
import { useForm } from '../../hooks/useForm';
import { Button, Input, Select } from '../ui';

interface BuyInFormProps {
    onSubmit: (payload: { playerId: number; amountCents: number }) => Promise<void>;
    players: Player[];
}

interface Values extends Record<string, unknown> {
    playerId: string;
    amount: string;
}

export default function BuyInForm({ onSubmit, players }: BuyInFormProps) {
    const { t } = usePreferences();
    const options = players
        .filter(player => player.isActive)
        .map(player => ({ value: String(player.id), label: player.name }));

    const { isSubmitting, handleSubmit, getFieldProps } = useForm<Values>({
        initialValues: { playerId: '', amount: '' },
        onSubmit: values =>
            onSubmit({ playerId: Number(values.playerId), amountCents: toCents(values.amount) }),
        validate: values => {
            const result: Partial<Record<keyof Values, string>> = {};
            if (!values.playerId) result.playerId = t('selectPlayerRequired');
            if (!(toCents(values.amount) > 0)) result.amount = t('amountPositive');
            return result;
        },
    });

    return (
        <form onSubmit={handleSubmit} className="grid gap-3">
            <Select
                label={t('player')}
                options={options}
                placeholder={t('selectPlayer')}
                {...getFieldProps('playerId')}
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
