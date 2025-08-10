import { FormEvent, useCallback, useState } from 'react';

interface UseFormConfig<T> {
    initialValues: T;
    onSubmit: (values: T) => Promise<void> | void;
    validate?: (values: T) => Partial<Record<keyof T, string>>;
}

export function useForm<T extends Record<string, any>>({
    initialValues,
    onSubmit,
    validate,
}: UseFormConfig<T>) {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setValue = useCallback(
        (name: keyof T, value: T[keyof T]) => {
            setValues(prev => ({ ...prev, [name]: value }));
            if (errors[name]) {
                setErrors(prev => ({ ...prev, [name]: undefined }));
            }
        },
        [errors],
    );

    const setFieldError = useCallback((name: keyof T, error: string) => {
        setErrors(prev => ({ ...prev, [name]: error }));
    }, []);

    const clearErrors = useCallback(() => {
        setErrors({});
    }, []);

    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
    }, [initialValues]);

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();

            if (isSubmitting) return;

            if (validate) {
                const validationErrors = validate(values);
                if (Object.keys(validationErrors).length > 0) {
                    setErrors(validationErrors);
                    return;
                }
            }

            setIsSubmitting(true);
            setErrors({});

            try {
                await onSubmit(values);
            } catch (error) {
                throw error;
            } finally {
                setIsSubmitting(false);
            }
        },
        [values, validate, onSubmit, isSubmitting],
    );

    const getFieldProps = useCallback(
        (name: keyof T) => ({
            value: values[name] ?? '',
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                setValue(name, e.target.value as T[keyof T]),
            error: errors[name],
        }),
        [values, errors, setValue],
    );

    return {
        values,
        errors,
        isSubmitting,
        setValue,
        setFieldError,
        clearErrors,
        reset,
        handleSubmit,
        getFieldProps,
    };
}
