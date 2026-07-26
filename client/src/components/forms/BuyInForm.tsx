import type { Player } from '@fnp/shared';
import { toCents } from '@fnp/shared';

import { usePreferences } from '../../contexts/PreferencesContext';
import { useForm } from '../../hooks/useForm';
import { Button, Input, Select } from '../ui';

interface BuyInFormProps {
    onSubmit: (payload: { playerId: number; amountCents: number }) => Promise<void>;
    players: Player[];
    /**
     * Set when the buy-in was started from a player's own row, which is the usual path.
     * The dropdown then has nothing left to ask, so it is not rendered — re-asking who
     * you just tapped is a question with a known answer.
     */
    player?: Player;
}

interface Values extends Record<string, unknown> {
    playerId: string;
    amount: string;
}

export default function BuyInForm({ onSubmit, players, player }: BuyInFormProps) {
    const { t } = usePreferences();
    const options = players
        .filter(candidate => candidate.isActive)
        .map(candidate => ({ value: String(candidate.id), label: candidate.name }));

    const { isSubmitting, handleSubmit, getFieldProps } = useForm<Values>({
        initialValues: { playerId: player ? String(player.id) : '', amount: '' },
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
            {!player && (
                <Select
                    label={t('player')}
                    options={options}
                    placeholder={t('selectPlayer')}
                    {...getFieldProps('playerId')}
                />
            )}
            <Input
                label={t('amount')}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder={t('amount')}
                data-autofocus={player ? '' : undefined}
                {...getFieldProps('amount')}
            />
            {/* A control says what it does: this button registers a buy-in, it does not
                "save". The action keeps that name from the row that opened it through to
                the toast that confirms it. */}
            <Button type="submit" loading={isSubmitting}>
                {t('registerBuyIn')}
            </Button>
        </form>
    );
}
