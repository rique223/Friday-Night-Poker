import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import type { AuthUser, LoginBody } from '@fnp/shared';

import { setUnauthorizedHandler } from '../services/apiClient';
import * as authService from '../services/authService';

interface AuthValue {
    user: AuthUser | null;
    loading: boolean;
    login: (payload: LoginBody) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            setUser(await authService.me());
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    // Q54: when the two-day cookie expires mid-session, every request used to fail with a
    // red toast while `user` stayed set — so `ProtectedRoute` never redirected and the
    // user was stranded on a page that could not work.
    useEffect(() => {
        setUnauthorizedHandler(() => setUser(null));
        return () => setUnauthorizedHandler(() => undefined);
    }, []);

    const login = useCallback(async (payload: LoginBody) => {
        setUser(await authService.login(payload));
    }, []);

    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } finally {
            setUser(null);
        }
    }, []);

    // Q72: this object used not to be memoised at all, so every consumer re-rendered on
    // each provider render.
    const value = useMemo(
        () => ({ user, loading, login, logout, refresh }),
        [user, loading, login, logout, refresh],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
