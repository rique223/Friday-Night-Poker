import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defence in depth against CSRF, on top of the `SameSite=Lax` cookie (Q17).
 *
 * The client is served from the same origin as the API, so a state-changing request
 * that announces a *different* origin cannot be one of ours. Browsers always send
 * `Origin` on cross-origin requests, so this costs nothing for legitimate traffic and
 * needs no token plumbing — the "simple but secure" answer to Q17.
 *
 * `cors()` was removed entirely rather than configured: with same-origin serving in
 * production and Vite's `/api` proxy in development, no browser ever makes a
 * cross-origin request to this API, so `cors({ origin: true })` was pure attack surface
 * (Q16).
 */
export function originGuard(req: Request, res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method)) {
        next();
        return;
    }

    const origin = req.get('origin');
    if (!origin) {
        // Non-browser clients (curl, the health checker) send no Origin at all.
        next();
        return;
    }

    let originHost: string;
    try {
        originHost = new URL(origin).host;
    } catch {
        res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN_ORIGIN', message: 'Malformed Origin header' },
        });
        return;
    }

    if (originHost !== req.get('host')) {
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN_ORIGIN',
                message: 'Cross-origin state-changing requests are not allowed',
            },
        });
        return;
    }

    next();
}
