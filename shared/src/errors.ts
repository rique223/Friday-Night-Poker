/**
 * Machine-readable error codes returned by the API.
 *
 * The client maps these to translated messages (see Q45/Q71), so the human-readable
 * `message` in an error response is a developer-facing fallback, never the UI copy.
 */
export const ERROR_CODES = [
    'VALIDATION_FAILED',
    'UNAUTHORIZED',
    'INVALID_CREDENTIALS',
    'RATE_LIMITED',
    'FORBIDDEN_ORIGIN',
    'NOT_FOUND',
    'SESSION_NOT_FOUND',
    'PLAYER_NOT_FOUND',
    'ENTRY_NOT_FOUND',
    'SESSION_NOT_OPEN',
    'SESSION_ARCHIVED',
    'SESSION_NOT_ENDED',
    'SESSION_NOT_ARCHIVED',
    'SESSION_HAS_ACTIVE_PLAYERS',
    'PLAYER_ALREADY_CASHED_OUT',
    'PLAYER_NOT_CASHED_OUT',
    'SELF_CREDIT_NOT_ALLOWED',
    'CREDIT_RECEIVER_CASHED_OUT',
    'PLAYER_HAS_MOVEMENTS',
    'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
