import { type ChangeEvent, type FormEvent, useCallback, useRef, useState } from 'react';

type Errors<T> = Partial<Record<keyof T, string>>;

interface UseFormConfig<T> {
    initialValues: T;
    onSubmit: (values: T) => Promise<void> | void;
    validate?: (values: T) => Errors<T>;
}

/**
 * Q52/Q62: `handleSubmit` used to be
 * `try { await onSubmit(values) } catch (e) { throw e } finally { … }`.
 *
 * The catch did nothing, and the rethrow landed in a promise that React discards —
 * `onSubmit={handleSubmit}` ignores the return value. So a failed login produced no
 * toast, no field error, nothing at all: the spinner just stopped. Every form also
 * leaked an unhandled rejection.
 *
 * The rejection is now captured into `submitError` for the caller to render, and the
 * promise this returns always resolves.
 */
export function useForm<T extends Record<string, unknown>>({
    initialValues,
    onSubmit,
    validate,
}: UseFormConfig<T>) {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Errors<T>>({});
    // Kept as the original thrown value, not a string, so callers can still read the
    // server's error `code` off an ApiClientError and translate it (Q71).
    const [submitError, setSubmitError] = useState<unknown>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Kept in a ref so `reset` doesn't change identity when a caller passes an inline
    // object literal as `initialValues`.
    const initialRef = useRef(initialValues);

    const setValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
        setValues(prev => ({ ...prev, [name]: value }));
        setErrors(prev => (prev[name] === undefined ? prev : { ...prev, [name]: undefined }));
    }, []);

    const reset = useCallback((next?: Partial<T>) => {
        setValues({ ...initialRef.current, ...next });
        setErrors({});
        setSubmitError(null);
    }, []);

    const handleSubmit = useCallback(
        async (event: FormEvent) => {
            event.preventDefault();
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
            setSubmitError(null);
            try {
                await onSubmit(values);
            } catch (error) {
                setSubmitError(error);
            } finally {
                setIsSubmitting(false);
            }
        },
        [values, validate, onSubmit, isSubmitting],
    );

    const getFieldProps = useCallback(
        (name: keyof T) => ({
            value: (values[name] ?? '') as string,
            onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                setValue(name, event.target.value as T[keyof T]),
            error: errors[name],
        }),
        [values, errors, setValue],
    );

    return {
        values,
        errors,
        submitError,
        isSubmitting,
        setValue,
        setSubmitError,
        reset,
        handleSubmit,
        getFieldProps,
    };
}
