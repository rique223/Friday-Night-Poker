import type { ErrorCode } from '@fnp/shared';

/**
 * The single error type thrown across the codebase (Q45).
 *
 * `code` is the contract: the client maps it to a translated message (Q71), so
 * `message` only ever needs to be useful to a developer reading a log.
 */
export class AppError extends Error {
    readonly code: ErrorCode;
    readonly status: number;
    readonly details: unknown;

    constructor(code: ErrorCode, status: number, message: string, details?: unknown) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

export const notFound = (code: ErrorCode, message: string) => new AppError(code, 404, message);
export const badRequest = (code: ErrorCode, message: string, details?: unknown) =>
    new AppError(code, 400, message, details);
export const conflict = (code: ErrorCode, message: string) => new AppError(code, 409, message);
