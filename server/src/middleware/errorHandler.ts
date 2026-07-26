import type { NextFunction, Request, Response } from 'express';
import type { ErrorCode } from '@fnp/shared';

import { AppError } from '../lib/errors.js';

/**
 * Note on 5xx bodies: `err.message` is still returned to the client. That was flagged as
 * an information leak (Q18) and explicitly accepted — this app is single-tenant and runs
 * on the owner's home network, and the raw message is what makes a failure debuggable
 * from a phone at the table. Revisit if it is ever exposed to the internet.
 */
export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    let status = 500;
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = 'Internal Server Error';
    let details: unknown;

    if (err instanceof AppError) {
        status = err.status;
        code = err.code;
        message = err.message;
        details = err.details;
    } else if (err instanceof Error) {
        message = err.message;
    }

    if (status >= 500) console.error(err);

    res.status(status).json({ success: false, error: { code, message, details } });
}

export function notFoundHandler(_req: Request, res: Response): void {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not Found' },
    });
}
