import { fromCents, toCents } from '@fnp/shared';

import { usePreferences } from '../../contexts/PreferencesContext';
import { useForm } from '../../hooks/useForm';
import { Button, Input } from '../ui';

interface EditAmountFormProps {
    currentAmountCents: number;
    onSubmit: (amountCents: number) => Promise<void>;
}

interface Values extends Record<string, unknown> {
    amount: string;
}

/** Q7: correcting a mistyped amount, which previously required editing SQLite by hand. */
export default function EditAmountForm({ currentAmountCents, onSubmit }: EditAmountFormProps) {
    const { t } = usePreferences();

    const { isSubmitting, handleSubmit, getFieldProps } = useForm<Values>({
        initialValues: { amount: String(fromCents(currentAmountCents)) },
        onSubmit: values => onSubmit(toCents(values.amount)),
        validate: values => (toCents(values.amount) > 0 ? {} : { amount: t('amountPositive') }),
    });

    return (
        <form onSubmit={handleSubmit} className="grid gap-3">
            <Input
                label={t('amount')}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                autoFocus
                {...getFieldProps('amount')}
            />
            <Button type="submit" loading={isSubmitting}>
                {t('save')}
            </Button>
        </form>
    );
}
