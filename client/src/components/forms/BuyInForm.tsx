import { usePreferences } from '../../contexts/PreferencesContext';
import { useForm } from '../../hooks/useForm';
import { BuyInPayload, Player } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface BuyInFormProps {
    onSubmit: (payload: BuyInPayload) => Promise<void>;
    players: Player[];
}

export default function BuyInForm({ onSubmit, players }: BuyInFormProps) {
    const { t } = usePreferences();

    const activePlayers = players.filter(p => p.isActive);
    const playerOptions = activePlayers.map(p => ({
        value: String(p.id),
        label: p.name,
    }));

    const { values, errors, isSubmitting, handleSubmit, getFieldProps } = useForm<{
        playerId: string;
        amount: string;
    }>({
        initialValues: {
            playerId: '',
            amount: '',
        },
        onSubmit: async data => {
            await onSubmit({
                playerId: Number(data.playerId),
                amount: Number(data.amount),
            });
        },
        validate: values => {
            const errors: any = {};
            if (!values.playerId) {
                errors.playerId = 'Please select a player';
            }
            if (!values.amount || Number(values.amount) <= 0) {
                errors.amount = 'Amount must be greater than 0';
            }
            return errors;
        },
    });

    return (
        <form onSubmit={handleSubmit} className="grid gap-3">
            <Select
                options={playerOptions}
                placeholder={t('selectPlayer')}
                required
                {...getFieldProps('playerId')}
            />
            <Input
                type="number"
                min="1"
                placeholder={t('amount')}
                required
                {...getFieldProps('amount')}
            />
            <Button type="submit" loading={isSubmitting}>
                {t('save')}
            </Button>
        </form>
    );
}
