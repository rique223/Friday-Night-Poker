import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

import { badRequest } from '../lib/errors.js';

/**
 * Replaces the hand-rolled `typeof` chains that used to live in every controller (Q31).
 *
 * Those were duplicated, incomplete (`initialBuyIn: -5` and a negative `finalChipCount`
 * both passed), and left `page`/`pageSize` entirely unchecked — `?pageSize=abc` reached
 * SQLite as `LIMIT NaN` and came back as a 500 (Q32).
 *
 * Parsed output replaces the raw input, so downstream code sees coerced, defaulted,
 * bounded values rather than strings.
 */
export interface ValidatedRequest<P = unknown, B = unknown, Q = unknown> extends Request {
    valid: { params: P; body: B; query: Q };
}

export function validate<
    P extends z.ZodType = z.ZodType,
    B extends z.ZodType = z.ZodType,
    Q extends z.ZodType = z.ZodType,
>(schemas: { params?: P; body?: B; query?: Q }): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
        const parsed: Record<string, unknown> = {};

        for (const source of ['params', 'body', 'query'] as const) {
            const schema = schemas[source];
            if (!schema) continue;

            const result = schema.safeParse(req[source] ?? {});
            if (!result.success) {
                next(
                    badRequest(
                        'VALIDATION_FAILED',
                        `Invalid request ${source}`,
                        result.error.issues.map(issue => ({
                            path: [source, ...issue.path.map(String)].join('.'),
                            message: issue.message,
                        })),
                    ),
                );
                return;
            }
            parsed[source] = result.data;
        }

        // `req.query` is a getter-only property on Express 5, so validated values live on
        // their own namespace rather than being written back over the originals.
        (req as ValidatedRequest).valid = {
            params: parsed['params'] ?? {},
            body: parsed['body'] ?? {},
            query: parsed['query'] ?? {},
        } as ValidatedRequest['valid'];
        next();
    };
}

/** Narrows the request to the shapes a route declared, for use inside a handler. */
export function validated<P, B, Q>(req: Request): ValidatedRequest<P, B, Q>['valid'] {
    return (req as ValidatedRequest<P, B, Q>).valid;
}
