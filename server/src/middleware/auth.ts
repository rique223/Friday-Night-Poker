import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import type { AuthenticatedUser } from '../services/userService.js';

const COOKIE = 'session';
const MAX_AGE_S = 60 * 60 * 24 * 2; // 2 days

export interface SessionClaims {
    sub: number;
    email: string;
    role: string;
}

declare module 'express-serve-static-core' {
    interface Request {
        user?: SessionClaims;
    }
}

export function issueSession(res: Response, user: AuthenticatedUser): void {
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, {
        algorithm: 'HS256',
        expiresIn: MAX_AGE_S,
    });

    res.cookie(COOKIE, token, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: MAX_AGE_S * 1000,
        path: '/',
    });
}

export function clearSession(res: Response): void {
    res.clearCookie(COOKIE, { path: '/' });
}

function unauthorized(res: Response): void {
    res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    });
}

/** A verified token still has to carry the claims we signed, not just be well-formed. */
function toClaims(payload: string | jwt.JwtPayload): SessionClaims | null {
    if (typeof payload === 'string') return null;
    const { sub, email, role } = payload;
    if (typeof email !== 'string' || typeof role !== 'string') return null;
    const id = typeof sub === 'string' ? Number(sub) : sub;
    if (typeof id !== 'number' || !Number.isFinite(id)) return null;
    return { sub: id, email, role };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token = req.cookies?.[COOKIE] as string | undefined;
    if (!token) {
        unauthorized(res);
        return;
    }

    try {
        const claims = toClaims(jwt.verify(token, config.jwtSecret));
        if (!claims) {
            unauthorized(res);
            return;
        }
        req.user = claims;
        next();
    } catch {
        unauthorized(res);
    }
}
