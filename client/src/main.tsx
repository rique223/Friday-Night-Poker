import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';

import { PreferencesProvider } from './contexts/PreferencesContext';
import { AuthProvider } from './contexts/AuthContext';

const rootEl = document.getElementById('root') as HTMLElement;
createRoot(rootEl).render(
	<StrictMode>
		<AuthProvider>
			<BrowserRouter>
				<PreferencesProvider>
					<App />
					<Toaster position='top-right' />
				</PreferencesProvider>
			</BrowserRouter>
		</AuthProvider>
	</StrictMode>,
);
