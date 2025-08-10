import { useForm } from '../../hooks/useForm';
import { AddPlayerPayload } from '../../types';
import { usePreferences } from '../../contexts/PreferencesContext';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface AddPlayerFormProps {
  onSubmit: (payload: AddPlayerPayload) => Promise<void>;
  defaultInitialBuyIn?: string;
}

export default function AddPlayerForm({ onSubmit, defaultInitialBuyIn = '' }: AddPlayerFormProps) {
  const { t } = usePreferences();

  const {
    values,
    errors,
    isSubmitting,
    handleSubmit,
    getFieldProps,
    reset,
  } = useForm<AddPlayerPayload>({
    initialValues: {
      name: '',
      initialBuyIn: Number(defaultInitialBuyIn) || 0,
    },
    onSubmit: async (data) => {
      await onSubmit(data);
      // Save the initial buy-in to localStorage for next time
      localStorage.setItem('lastInitialBuyIn', String(data.initialBuyIn));
      reset();
      // Focus the name input after successful submission
      const nameInput = document.getElementById('add-player-name') as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
      }
    },
    validate: (values) => {
      const errors: Partial<Record<keyof AddPlayerPayload, string>> = {};
      if (!values.name?.trim()) {
        errors.name = 'Name is required';
      }
      if (!values.initialBuyIn || values.initialBuyIn <= 0) {
        errors.initialBuyIn = 'Initial buy-in must be greater than 0';
      }
      return errors;
    },
  });

  return (
    <section className='card p-5'>
      <h2 className='font-semibold mb-3'>{t('addPlayer')}</h2>
      <form onSubmit={handleSubmit} className='flex flex-col gap-2'>
        <div className='flex flex-row gap-2'>
          <Input
            id="add-player-name"
            label={t('name')}
            placeholder={t('name')}
            className='flex-1 basis-0 min-w-0'
            required
            {...getFieldProps('name')}
          />
          <Input
            label={t('initialBuyIn')}
            type='number'
            min='1'
            placeholder={t('initialBuyIn')}
            className='flex-1 basis-0 min-w-0'
            required
            {...getFieldProps('initialBuyIn')}
            onChange={(e) => {
              const value = e.target.value;
              getFieldProps('initialBuyIn').onChange({
                ...e,
                target: { ...e.target, value: Number(value) || 0 }
              } as any);
            }}
          />
        </div>
        <Button type="submit" loading={isSubmitting} className='w-full'>
          {t('add')}
        </Button>
      </form>
    </section>
  );
}
