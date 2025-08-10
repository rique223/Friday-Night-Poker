import { useLocation, useNavigate } from 'react-router-dom';

import LangCurrencySwitcher from '../components/LangCurrencySwitcher';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from '../hooks/useForm';
import { LoginPayload } from '../types/auth';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const { isSubmitting, handleSubmit, getFieldProps } = useForm<LoginPayload>({
        initialValues: {
            email: '',
            password: '',
        },
        onSubmit: async data => {
            const from = location.state?.from?.pathname || '/';
            await login(data);
            navigate(from, { replace: true });
        },
        validate: values => {
            const errors: Partial<Record<keyof LoginPayload, string>> = {};
            if (!values.email?.trim()) {
                errors.email = 'Email is required';
            }
            if (!values.password?.trim()) {
                errors.password = 'Password is required';
            }
            return errors;
        },
    });

    return (
        <div className="min-h-screen max-w-4xl mx-auto p-6 grid place-items-center">
            <div className="w-full max-w-md">
                <header className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight">Friday Night Poker</h1>
                    <div className="flex items-center gap-2">
                        <LangCurrencySwitcher />
                        <ThemeToggle />
                    </div>
                </header>

                <section className="card p-6 space-y-5">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold">Sign in</h2>
                        <p className="text-sm text-[var(--text-dim)]">
                            Enter your credentials to continue.
                        </p>
                    </div>

                    <form className="grid gap-3" onSubmit={handleSubmit}>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="username"
                            autoCapitalize="none"
                            spellCheck="false"
                            placeholder="you@example.com"
                            label="Email"
                            required
                            {...getFieldProps('email')}
                        />
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            label="Password"
                            required
                            {...getFieldProps('password')}
                        />
                        <Button type="submit" loading={isSubmitting} className="w-full">
                            Sign in
                        </Button>
                    </form>
                </section>
            </div>
        </div>
    );
}
