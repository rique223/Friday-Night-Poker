import type { AuthUser, LoginBody } from '@fnp/shared';

import api, { ApiClientError } from './apiClient';

interface Envelope<T> {
    success: true;
    data: T;
}

/** Returns `null` when nobody is signed in, rather than throwing on the expected 401. */
export async function me(): Promise<AuthUser | null> {
    try {
        const { data } = await api.get<Envelope<AuthUser>>('/auth/me');
        return data.data;
    } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) return null;
        throw error;
    }
}

export async function login(body: LoginBody): Promise<AuthUser> {
    const { data } = await api.post<Envelope<AuthUser>>('/auth/login', body);
    return data.data;
}

export async function logout(): Promise<void> {
    await api.post('/auth/logout');
}
