import { z } from 'zod';

import { ERROR_CODES } from './errors.js';
import { MAX_AMOUNT_CENTS } from './money.js';

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

/** An amount of money in integer cents. Must be positive — reversals are deletions. */
export const AmountCents = z
    .int()
    .positive()
    .max(MAX_AMOUNT_CENTS)
    .describe('Amount in integer cents (100 = 1.00).');

/** A chip count in integer cents. Zero is valid — a player can bust out. */
export const ChipCountCents = z
    .int()
    .min(0)
    .max(MAX_AMOUNT_CENTS)
    .describe('Chip count in integer cents, at 1 chip = 1 currency unit.');

/** A signed balance in integer cents. */
export const BalanceCents = z.int().describe('Signed balance in integer cents.');

export const Id = z.int().positive();

/** ISO-8601 UTC instant, always with a `Z` suffix (Q29). */
export const Timestamp = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'Expected ISO-8601 UTC (…Z)');

export const DisplayName = z.string().trim().min(1).max(80);

export const SessionStatus = z.enum(['open', 'ended', 'archived']);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const GroupBy = z.enum(['week', 'month', 'year']);
export type GroupBy = z.infer<typeof GroupBy>;

/* -------------------------------------------------------------------------- */
/* Envelopes                                                                   */
/* -------------------------------------------------------------------------- */

export const ApiError = z.object({
    success: z.literal(false),
    error: z.object({
        code: z.enum(ERROR_CODES),
        message: z.string(),
        details: z.unknown().optional(),
    }),
});
export type ApiError = z.infer<typeof ApiError>;

export function apiSuccess<T extends z.ZodType>(data: T) {
    return z.object({ success: z.literal(true), data });
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const LoginBody = z.object({
    email: z.email().max(254),
    password: z.string().min(1).max(200),
});
export type LoginBody = z.infer<typeof LoginBody>;

export const AuthUser = z.object({
    email: z.string(),
    role: z.string(),
});
export type AuthUser = z.infer<typeof AuthUser>;

/* -------------------------------------------------------------------------- */
/* Movements                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One entry in a player's buy-in log.
 *
 * `creditId` is set when the entry represents chips received from another player
 * rather than bought from the house. Per Q4 those still count toward `totalBuyInsCents`
 * — the flag exists so the pair can be edited or undone together (Q7).
 */
export const BuyInEntry = z.object({
    id: z.string(),
    amountCents: AmountCents,
    createdAt: Timestamp,
    creditId: z.string().optional(),
    fromPlayerId: Id.optional(),
});
export type BuyInEntry = z.infer<typeof BuyInEntry>;

/** One entry in a player's credit log: chips this player lent to another. */
export const CreditEntry = z.object({
    id: z.string(),
    creditId: z.string(),
    toPlayerId: Id,
    amountCents: AmountCents,
    createdAt: Timestamp,
});
export type CreditEntry = z.infer<typeof CreditEntry>;

/* -------------------------------------------------------------------------- */
/* Players                                                                     */
/* -------------------------------------------------------------------------- */

export const Player = z.object({
    id: Id,
    name: z.string(),
    isActive: z.boolean(),
    /** `sum(credits given) - sum(buy-ins)`. Negative until the player lends chips. */
    netBalanceCents: BalanceCents,
    totalBuyInsCents: z.int().min(0),
    totalCreditsCents: z.int().min(0),
    finalChipCountCents: ChipCountCents.nullable(),
    /** `finalChipCount + netBalance`: what the house pays (+) or is owed (−). */
    payoutCents: BalanceCents.nullable(),
    buyIns: z.array(BuyInEntry),
    credits: z.array(CreditEntry),
    createdAt: Timestamp,
    updatedAt: Timestamp,
});
export type Player = z.infer<typeof Player>;

/* -------------------------------------------------------------------------- */
/* Sessions                                                                    */
/* -------------------------------------------------------------------------- */

export const SessionSummary = z.object({
    id: Id,
    status: SessionStatus,
    createdAt: Timestamp,
    createdBy: z.string().nullable(),
});
export type SessionSummary = z.infer<typeof SessionSummary>;

export const SessionDetail = SessionSummary.extend({
    players: z.array(Player),
});
export type SessionDetail = z.infer<typeof SessionDetail>;

export const SessionGroup = z.object({
    /** Sortable, locale-independent key, e.g. `2026-W30`, `2026-07`, `2026`. */
    key: z.string(),
    /** Start of the group's range as a UTC date, for client-side locale formatting. */
    startDate: z.string(),
    sessions: z.array(SessionSummary),
});
export type SessionGroup = z.infer<typeof SessionGroup>;

/**
 * Sessions are paginated **by group**, not by row (Q73), so a week is never split
 * across pages and a group header never repeats on the next page.
 */
export const SessionGroupPage = z.object({
    groups: z.array(SessionGroup),
    page: z.int().positive(),
    pageSize: z.int().positive(),
    totalGroups: z.int().min(0),
    totalSessions: z.int().min(0),
    groupBy: GroupBy,
});
export type SessionGroupPage = z.infer<typeof SessionGroupPage>;

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export const ListSessionsQuery = z.object({
    status: SessionStatus.or(z.literal('all')).default('all'),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    q: z.string().trim().max(80).default(''),
    groupBy: GroupBy.default('week'),
    /**
     * The viewer's offset from UTC in minutes (`-new Date().getTimezoneOffset()`), so a
     * Friday-night session near midnight groups into the day the players experienced.
     */
    tzOffsetMinutes: z.coerce.number().int().min(-840).max(840).default(0),
});
export type ListSessionsQuery = z.infer<typeof ListSessionsQuery>;

export const SessionIdParams = z.object({ sessionId: z.coerce.number().int().positive() });
export const PlayerIdParams = SessionIdParams.extend({
    playerId: z.coerce.number().int().positive(),
});
export const EntryIdParams = SessionIdParams.extend({ entryId: z.string().min(1).max(64) });

export const CreateSessionBody = z.object({
    createdBy: DisplayName.optional(),
});
export type CreateSessionBody = z.infer<typeof CreateSessionBody>;

/** Drives the whole lifecycle: `open → ended → archived`, plus unarchive (Q10/Q11). */
export const UpdateSessionBody = z.object({
    status: SessionStatus,
});
export type UpdateSessionBody = z.infer<typeof UpdateSessionBody>;

export const AddPlayerBody = z.object({
    name: DisplayName,
    initialBuyInCents: AmountCents,
});
export type AddPlayerBody = z.infer<typeof AddPlayerBody>;

export const BuyInBody = z.object({
    playerId: Id,
    amountCents: AmountCents,
});
export type BuyInBody = z.infer<typeof BuyInBody>;

export const UpdateAmountBody = z.object({
    amountCents: AmountCents,
});
export type UpdateAmountBody = z.infer<typeof UpdateAmountBody>;

export const CreditBody = z
    .object({
        providerId: Id,
        receiverId: Id,
        amountCents: AmountCents,
    })
    .refine(v => v.providerId !== v.receiverId, {
        message: 'A player cannot give a credit to themselves',
        path: ['receiverId'],
    });
export type CreditBody = z.infer<typeof CreditBody>;

export const CashOutBody = z.object({
    playerId: Id,
    finalChipCountCents: ChipCountCents,
});
export type CashOutBody = z.infer<typeof CashOutBody>;

/* -------------------------------------------------------------------------- */
/* Responses                                                                   */
/* -------------------------------------------------------------------------- */

export const CreatedSession = z.object({ sessionId: Id });
export const CreatedPlayer = z.object({ playerId: Id });
export const CreatedEntry = z.object({ entryId: z.string() });
export const CreatedCredit = z.object({ creditId: z.string() });
export const CashOutResult = z.object({ payoutCents: BalanceCents });
export const HealthResult = z.object({
    ok: z.boolean(),
    database: z.enum(['up', 'down']),
    uptimeSeconds: z.number(),
});
export type HealthResult = z.infer<typeof HealthResult>;
