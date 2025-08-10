import { useForm } from '../../hooks/useForm';
import { CashOutPayload, Player } from '../../types';
import { usePreferences } from '../../contexts/PreferencesContext';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface CashOutFormProps {
  onSubmit: (payload: CashOutPayload) => Promise<void>;
  player: Player;
}

export default function CashOutForm({ onSubmit, player }: CashOutFormProps) {
  const { t } = usePreferences();

  const {
    values,
    errors,
    isSubmitting,
    handleSubmit,
    getFieldProps,
  } = useForm<{ finalChipCount: string }>({
    initialValues: {
      finalChipCount: '',
    },
    onSubmit: async (data) => {
      await onSubmit({
        playerId: player.id,
        finalChipCount: Number(data.finalChipCount),
      });
    },
    validate: (values) => {
      const errors: any = {};
      if (!values.finalChipCount || Number(values.finalChipCount) < 0) {
        errors.finalChipCount = 'Final chip count must be 0 or greater';
      }
      return errors;
    },
  });

  return (
    <form onSubmit={handleSubmit} className='grid gap-3'>
      <div className='text-sm text-[var(--text-dim)]'>
        {t('player')}: {player.name}
      </div>
      <Input
        type='number'
        min='0'
        placeholder={t('finalChips')}
        required
        {...getFieldProps('finalChipCount')}
      />
      <Button type="submit" loading={isSubmitting}>
        {t('confirmCashOut')}
      </Button>
    </form>
  );
}
