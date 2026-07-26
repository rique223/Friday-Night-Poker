import { useLocation, useNavigate } from 'react-router-dom';

import LangCurrencySwitcher from '../components/LangCurrencySwitcher';
import ThemeToggle from '../components/ThemeToggle';
import { Button, Input } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useApiError } from '../hooks/useApiError';
import { useForm } from '../hooks/useForm';

interface Values extends Record<string, unknown> {
    email: string;
    password: string;
}

interface LocationState {
    from?: { pathname?: string };
}

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const { t } = usePreferences();
    const { messageFor } = useApiError();

    const { submitError, isSubmitting, handleSubmit, getFieldProps } = useForm<Values>({
        initialValues: { email: '', password: '' },
        onSubmit: async values => {
            await login({ email: values.email.trim(), password: values.password });
            const from = (location.state as LocationState | null)?.from?.pathname ?? '/';
            navigate(from, { replace: true });
        },
        validate: values => {
            const result: Partial<Record<keyof Values, string>> = {};
            if (!values.email.trim()) result.email = t('emailRequired');
            if (!values.password) result.password = t('passwordRequired');
            return result;
        },
    });

    return (
        <div className="min-h-screen max-w-4xl mx-auto p-6 grid place-items-center">
            <div className="w-full max-w-md">
                <header className="flex items-center justify-between mb-6 gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight">Friday Night Poker</h1>
                    <div className="flex items-center gap-2">
                        <LangCurrencySwitcher />
                        <ThemeToggle />
                    </div>
                </header>

                <section className="card p-6 space-y-5">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold">{t('login')}</h2>
                        <p className="text-sm text-dim">{t('enterCredentials')}</p>
                    </div>

                    <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
                        <Input
                            id="email"
                            // Q82: the label said "E-mail ou usuário" but `verifyUser` only
                            // ever queried `users.email` — username login never existed.
                            label={t('email')}
                            type="email"
                            autoComplete="username"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="you@example.com"
                            {...getFieldProps('email')}
                        />
                        <Input
                            id="password"
                            label={t('password')}
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            {...getFieldProps('password')}
                        />

                        {/* Q52: a wrong password used to produce nothing at all — no toast,
                            no field error — because `useForm` rethrew into a promise React
                            discards. The failure is now rendered here, translated (Q71). */}
                        {submitError !== null && (
                            <p role="alert" className="text-sm text-danger">
                                {messageFor(submitError, 'failedLogin')}
                            </p>
                        )}

                        <Button type="submit" loading={isSubmitting} className="w-full">
                            {t('login')}
                        </Button>
                    </form>
                </section>
            </div>
        </div>
    );
}
