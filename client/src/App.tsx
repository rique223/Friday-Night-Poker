import { lazy, type ReactNode, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import { Button, LoadingSpinner } from './components/ui';
import { useAuth } from './contexts/AuthContext';
import { usePreferences } from './contexts/PreferencesContext';

const SessionListPage = lazy(() => import('./pages/SessionListPage'));
const SessionDetailPage = lazy(() => import('./pages/SessionDetailPage'));
const ArchivedSessionsPage = lazy(() => import('./pages/ArchivedSessionsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

function FullPageSpinner() {
    return (
        <div className="min-h-screen grid place-items-center">
            <LoadingSpinner size="lg" />
        </div>
    );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <FullPageSpinner />;
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
}

function ErrorFallback({ reset }: { reset: () => void }) {
    const { t } = usePreferences();
    return (
        <div className="min-h-screen grid place-items-center p-6">
            <div className="card p-6 max-w-md text-center space-y-3">
                <h1 className="text-lg font-semibold">{t('somethingWentWrong')}</h1>
                <p className="text-sm text-dim">{t('somethingWentWrongHint')}</p>
                <div className="flex gap-2 justify-center">
                    <Button variant="secondary" onClick={reset}>
                        {t('back')}
                    </Button>
                    <Button onClick={() => window.location.reload()}>{t('reload')}</Button>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <main className="min-h-screen bg-bg text-text">
            {/* Q67: a render-time throw — including a lazy chunk that 404s after a
                redeploy — used to blank the whole app with no message at all. */}
            <ErrorBoundary fallback={reset => <ErrorFallback reset={reset} />}>
                <Suspense fallback={<FullPageSpinner />}>
                    <Routes>
                        <Route
                            element={
                                <ProtectedRoute>
                                    <Outlet />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/" element={<SessionListPage />} />
                            <Route path="/sessions/:id" element={<SessionDetailPage />} />
                            <Route path="/archived" element={<ArchivedSessionsPage />} />
                        </Route>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </ErrorBoundary>
        </main>
    );
}
