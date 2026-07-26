import type { NextFunction, Request, Response } from 'express';

/** API responses are per-user and always fresh; nothing here should ever be cached. */
export function cacheControl(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader('Cache-Control', 'no-store');
    next();
}
