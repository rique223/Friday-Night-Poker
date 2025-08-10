import { lazy, ReactNode, Suspense, useState } from 'react';
import { usePreferences } from './contexts/PreferencesContext';
import { Route, Routes, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

const SessionListPage = lazy(() => import('./pages/SessionListPage'));
const SessionDetailPage = lazy(() => import('./pages/SessionDetailPage'));
const ArchivedSessionsPage = lazy(() => import('./pages/ArchivedSessionsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
	const { t } = usePreferences();
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) return <div className='p-4'>{t('loading')}</div>;

	if (!user) return <Navigate to='/login' state={{ from: location }} replace />;
	return children;
};

export default function App() {
	const { t } = usePreferences();

	return (
		<main className='min-h-screen bg-[var(--bg)] text-[var(--text)]'>
			<Suspense fallback={<div className='p-4'>{t('loading')}</div>}>
				<Routes>
					<Route
						element={
							<ProtectedRoute>
								<Outlet />
							</ProtectedRoute>
						}
					>
						<Route path='/' element={<SessionListPage />} />
						<Route path='/sessions/:id' element={<SessionDetailPage />} />
						<Route path='/archived' element={<ArchivedSessionsPage />} />
					</Route>
					<Route path='/login' element={<LoginPage />} />
					<Route path='*' element={<Navigate to='/' replace />} />
				</Routes>
			</Suspense>
		</main>
	);
}
