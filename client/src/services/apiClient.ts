import type { ApiError, ErrorCode } from '@fnp/shared';
import axios, { AxiosError } from 'axios';

/**
 * A normalised API failure.
 *
 * Q53: without this, every failure surfaced as axios's own
 * `"Request failed with status code 400"`, because the server's message lives at
 * `error.response.data.error` and nothing ever looked there. Every carefully written
 * server message in the codebase was unreachable from the UI.
 *
 * `code` is what callers branch on and what the UI translates (Q71); `message` is the
 * server's developer-facing text, kept only as a last-resort fallback.
 */
export class ApiClientError extends Error {
    readonly code: ErrorCode | 'NETWORK';
    readonly status: number;
    readonly details: unknown;

    constructor(code: ErrorCode | 'NETWORK', status: number, message: string, details?: unknown) {
        super(message);
        this.name = 'ApiClientError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

const apiClient = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

/** Notified when a request comes back 401 so auth state can be cleared (Q54). */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler = () => undefined;

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
    onUnauthorized = handler;
}

function isApiError(data: unknown): data is ApiError {
    return (
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof (data as ApiError).error?.code === 'string'
    );
}

apiClient.interceptors.response.use(
    response => response,
    (error: unknown) => {
        if (!(error instanceof AxiosError)) {
            const message = error instanceof Error ? error.message : String(error);
            return Promise.reject(new ApiClientError('INTERNAL_ERROR', 0, message));
        }

        if (!error.response) {
            return Promise.reject(
                new ApiClientError('NETWORK', 0, error.message || 'Network error'),
            );
        }

        const status = error.response.status;
        const payload: unknown = error.response.data;

        // Login is excluded: a wrong password is a form error, not an expired session,
        // and redirecting would wipe the message the user needs to see.
        const isLoginAttempt = error.config?.url?.includes('/auth/login') ?? false;
        if (status === 401 && !isLoginAttempt) onUnauthorized();

        if (isApiError(payload)) {
            return Promise.reject(
                new ApiClientError(
                    payload.error.code,
                    status,
                    payload.error.message,
                    payload.error.details,
                ),
            );
        }

        return Promise.reject(new ApiClientError('INTERNAL_ERROR', status, error.message));
    },
);

export default apiClient;
