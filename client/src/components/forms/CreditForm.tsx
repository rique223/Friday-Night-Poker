import { useForm } from '../../hooks/useForm';
import { CreditPayload, Player } from '../../types';
import { usePreferences } from '../../contexts/PreferencesContext';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface CreditFormProps {
  onSubmit: (payload: CreditPayload) => Promise<void>;
  players: Player[];
}

export default function CreditForm({ onSubmit, players }: CreditFormProps) {
  const { t } = usePreferences();

  const activePlayers = players.filter(p => p.isActive);
  const playerOptions = activePlayers.map(p => ({
    value: String(p.id),
    label: p.name,
  }));

  const {
    values,
    errors,
    isSubmitting,
    handleSubmit,
    getFieldProps,
  } = useForm<{ providerId: string; receiverId: string; amount: string }>({
    initialValues: {
      providerId: '',
      receiverId: '',
      amount: '',
    },
    onSubmit: async (data) => {
      await onSubmit({
        providerId: Number(data.providerId),
        receiverId: Number(data.receiverId),
        amount: Number(data.amount),
      });
    },
    validate: (values) => {
      const errors: any = {};
      if (!values.providerId) {
        errors.providerId = 'Please select a provider';
      }
      if (!values.receiverId) {
        errors.receiverId = 'Please select a receiver';
      }
      if (values.providerId && values.receiverId && values.providerId === values.receiverId) {
        errors.receiverId = 'Provider and receiver cannot be the same';
      }
      if (!values.amount || Number(values.amount) <= 0) {
        errors.amount = 'Amount must be greater than 0';
      }
      return errors;
    },
  });

  return (
    <form onSubmit={handleSubmit} className='grid gap-3'>
      <Select
        options={playerOptions}
        placeholder={t('provider')}
        required
        {...getFieldProps('providerId')}
      />
      <Select
        options={playerOptions}
        placeholder={t('receiver')}
        required
        {...getFieldProps('receiverId')}
      />
      <Input
        type='number'
        min='1'
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
