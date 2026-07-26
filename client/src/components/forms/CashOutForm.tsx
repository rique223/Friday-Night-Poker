import type { Player } from '@fnp/shared';
import { toCents } from '@fnp/shared';

import { usePreferences } from '../../contexts/PreferencesContext';
import { useForm } from '../../hooks/useForm';
import { Button, Input } from '../ui';

interface CashOutFormProps {
    onSubmit: (payload: { playerId: number; finalChipCountCents: number }) => Promise<void>;
    player: Player;
}

interface Values extends Record<string, unknown> {
    finalChipCount: string;
}

export default function CashOutForm({ onSubmit, player }: CashOutFormProps) {
    const { t, formatCurrency } = usePreferences();

    const { values, isSubmitting, handleSubmit, getFieldProps } = useForm<Values>({
        initialValues: { finalChipCount: '' },
        onSubmit: values =>
            onSubmit({
                playerId: player.id,
                finalChipCountCents: toCents(values.finalChipCount),
            }),
        validate: values => {
            const cents = toCents(values.finalChipCount);
            // Q81/Q31: zero is legitimate (a player can bust), so this checks for a
            // *missing* or negative value rather than a falsy one.
            if (values.finalChipCount.trim() === '' || !Number.isFinite(cents) || cents < 0) {
                return { finalChipCount: t('finalChipsRequired') };
            }
            return {};
        },
    });

    const entered = toCents(values.finalChipCount);
    const previewPayout = Number.isFinite(entered) ? entered + player.netBalanceCents : null;

    return (
        <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="text-sm text-dim">
                {t('player')}: <strong>{player.name}</strong>
                <br />
                {t('netBalance')}: {formatCurrency(player.netBalanceCents)}
            </div>
            <Input
                label={t('finalChips')}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder={t('finalChips')}
                {...getFieldProps('finalChipCount')}
            />
            {previewPayout !== null && values.finalChipCount.trim() !== '' && (
                <div className="text-sm">
                    {t('payout')}:{' '}
                    <strong className={previewPayout >= 0 ? 'text-success' : 'text-danger'}>
                        {formatCurrency(previewPayout)}
                    </strong>
                    <div className="text-xs text-dim">
                        {formatCurrency(entered)} + {formatCurrency(player.netBalanceCents)}
                    </div>
                </div>
            )}
            <Button type="submit" loading={isSubmitting}>
                {t('confirmCashOut')}
            </Button>
        </form>
    );
}
