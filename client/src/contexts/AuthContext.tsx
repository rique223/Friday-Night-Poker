import { createContext, useContext, useEffect, useState } from 'react';
import { User, LoginPayload, AuthContextType } from '../types/auth';
import { me as apiMe, login as apiLogin, logout as apiLogout } from '../services/authService';

const AuthCtx = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	async function refresh() {
		try {
			const data = await apiMe();
			setUser(data ?? null);
		} catch {
			setUser(null);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		refresh();
	}, []);

	async function logout() {
		try {
			await apiLogout();
		} catch {}
		setUser(null);
	}

	async function login(payload: LoginPayload) {
		const data = await apiLogin(payload);
		setUser(data ?? null);
	}

	return <AuthCtx.Provider value={{ user, loading, refresh, setUser, login, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthCtx);
	if (!ctx) throw new Error('useAuth outside AuthProvider');
	return ctx;
}
