import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import App from './App';

import './index.css';

const rootEl = document.getElementById('root') as HTMLElement;
createRoot(rootEl).render(
    <StrictMode>
        <AuthProvider>
            <BrowserRouter>
                <PreferencesProvider>
                    <App />
                    <Toaster position="top-right" />
                </PreferencesProvider>
            </BrowserRouter>
        </AuthProvider>
    </StrictMode>,
);
