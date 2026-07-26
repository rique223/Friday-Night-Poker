import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import App from './App';

import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Q95: a session left open on a phone now refreshes when the tab regains
            // focus or the network comes back, instead of showing stale data forever.
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            // A 401 or a validation error will not fix itself by trying again.
            retry: (failureCount, error) => {
                const status = (error as { status?: number }).status ?? 0;
                if (status >= 400 && status < 500) return false;
                return failureCount < 2;
            },
        },
    },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root is missing from index.html');

createRoot(rootEl).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <PreferencesProvider>
                    <AuthProvider>
                        <App />
                        <Toaster position="top-right" />
                    </AuthProvider>
                </PreferencesProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </StrictMode>,
);
