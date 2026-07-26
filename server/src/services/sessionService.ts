import { randomUUID } from 'node:crypto';

import type { Database } from 'sqlite';
import type {
    BuyInEntry,
    CreditEntry,
    GroupBy,
    Player,
    SessionDetail,
    SessionGroup,
    SessionGroupPage,
    SessionStatus,
    SessionSummary,
} from '@fnp/shared';

import { getDb, withTransaction } from '../db/index.js';
import { AppError, badRequest, conflict, notFound } from '../lib/errors.js';
import { nowIso } from '../lib/time.js';

/* -------------------------------------------------------------------------- */
/* Row shapes                                                                  */
/* -------------------------------------------------------------------------- */

interface SessionRow {
    id: number;
    isActive: number;
    createdAt: string;
    createdBy: string | null;
    deletedAt: string | null;
}

interface PlayerRow {
    id: number;
    name: string;
    isActive: number;
    netBalance: number;
    buyInsLog: string;
    creditsLog: string;
    finalChipCount: number | null;
    payout: number | null;
    createdAt: string;
    updatedAt: string;
}

const SESSION_COLUMNS = `id,
     is_active  AS isActive,
     created_at AS createdAt,
     created_by AS createdBy,
     deleted_at AS deletedAt`;

const PLAYER_COLUMNS = `id,
     name,
     is_active        AS isActive,
     net_balance      AS netBalance,
     buy_ins_log      AS buyInsLog,
     credits_log      AS creditsLog,
     final_chip_count AS finalChipCount,
     payout,
     created_at       AS createdAt,
     updated_at       AS updatedAt`;

/* -------------------------------------------------------------------------- */
/* Derivation                                                                  */
/* -------------------------------------------------------------------------- */

function parseLog<T>(value: string): T[] {
    try {
        const parsed: unknown = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
}

const sum = (entries: { amountCents: number }[]) =>
    entries.reduce((total, entry) => total + entry.amountCents, 0);

/**
 * Balances are **derived from the logs**, never adjusted incrementally.
 *
 * The old code did `net_balance = net_balance ± amount` on every write, which meant a
 * self-credit clobbered the row from a stale read (Q37) and there was no safe way to
 * correct a mistyped amount (Q7). Recomputing from the movements makes every write
 * idempotent and every correction trivially consistent.
 *
 * Sign convention (Q1, confirmed intended): chips taken from the bank count against you,
 * chips you lend to another player count for you.
 */
function deriveBalances(buyIns: BuyInEntry[], credits: CreditEntry[]) {
    const totalBuyInsCents = sum(buyIns);
    const totalCreditsCents = sum(credits);
    return {
        totalBuyInsCents,
        totalCreditsCents,
        netBalanceCents: totalCreditsCents - totalBuyInsCents,
    };
}

function toPlayer(row: PlayerRow): Player {
    const buyIns = parseLog<BuyInEntry>(row.buyInsLog);
    const credits = parseLog<CreditEntry>(row.creditsLog);
    return {
        id: row.id,
        name: row.name,
        isActive: row.isActive === 1,
        ...deriveBalances(buyIns, credits),
        finalChipCountCents: row.finalChipCount,
        payoutCents: row.payout,
        buyIns,
        credits,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function statusOf(row: Pick<SessionRow, 'isActive' | 'deletedAt'>): SessionStatus {
    if (row.deletedAt !== null) return 'archived';
    return row.isActive === 1 ? 'open' : 'ended';
}

function toSummary(row: SessionRow): SessionSummary {
    return {
        id: row.id,
        status: statusOf(row),
        createdAt: row.createdAt,
        createdBy: row.createdBy,
    };
}

/* -------------------------------------------------------------------------- */
/* Persistence helpers                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Writes a player's movement logs back, recomputing every derived column.
 *
 * `payout` is refreshed whenever the player has already cashed out, so correcting a
 * buy-in after the fact keeps the settlement figure honest.
 */
async function persistPlayer(
    db: Database,
    playerId: number,
    buyIns: BuyInEntry[],
    credits: CreditEntry[],
    finalChipCountCents: number | null,
): Promise<number | null> {
    const { netBalanceCents } = deriveBalances(buyIns, credits);
    const payoutCents = finalChipCountCents === null ? null : finalChipCountCents + netBalanceCents;

    await db.run(
        `UPDATE players
            SET net_balance = ?, buy_ins_log = ?, credits_log = ?, payout = ?, updated_at = ?
          WHERE id = ?`,
        netBalanceCents,
        JSON.stringify(buyIns),
        JSON.stringify(credits),
        payoutCents,
        nowIso(),
        playerId,
    );
    return payoutCents;
}

async function loadSessionRow(db: Database, sessionId: number): Promise<SessionRow> {
    const row = await db.get<SessionRow>(
        `SELECT ${SESSION_COLUMNS} FROM sessions WHERE id = ?`,
        sessionId,
    );
    if (!row) throw notFound('SESSION_NOT_FOUND', `Session ${sessionId} does not exist`);
    return row;
}

/**
 * Guards every mutating path. An archived session is frozen (Q39) — previously you could
 * still add players and register buy-ins on a soft-deleted session through the API.
 */
async function requireOpenSession(db: Database, sessionId: number): Promise<SessionRow> {
    const row = await loadSessionRow(db, sessionId);
    const status = statusOf(row);
    if (status === 'archived') {
        throw conflict('SESSION_ARCHIVED', `Session ${sessionId} is archived and read-only`);
    }
    if (status === 'ended') {
        throw conflict('SESSION_NOT_OPEN', `Session ${sessionId} has already ended`);
    }
    return row;
}

async function loadPlayerRow(
    db: Database,
    sessionId: number,
    playerId: number,
): Promise<PlayerRow> {
    const row = await db.get<PlayerRow>(
        `SELECT ${PLAYER_COLUMNS} FROM players WHERE id = ? AND session_id = ?`,
        playerId,
        sessionId,
    );
    if (!row) {
        throw notFound('PLAYER_NOT_FOUND', `Player ${playerId} is not in session ${sessionId}`);
    }
    return row;
}

/* -------------------------------------------------------------------------- */
/* Listing                                                                     */
/* -------------------------------------------------------------------------- */

/** Escapes LIKE wildcards so searching for `_` doesn't match every session (Q33). */
function likePattern(query: string): string {
    return `%${query.replace(/[\\%_]/g, ch => `\\${ch}`)}%`;
}

function statusFilter(status: SessionStatus | 'all'): string {
    switch (status) {
        case 'open':
            return 'deleted_at IS NULL AND is_active = 1';
        case 'ended':
            return 'deleted_at IS NULL AND is_active = 0';
        case 'archived':
            return 'deleted_at IS NOT NULL';
        case 'all':
            // Archiving is a soft delete, so it is excluded from the unfiltered list the
            // same way a deleted file is absent from `ls`. Ask for it explicitly.
            return 'deleted_at IS NULL';
    }
}

/**
 * SQL expressions for the group key, evaluated in the *viewer's* timezone.
 *
 * A Friday game that runs past midnight is still "Friday night" to the people at the
 * table, so grouping in UTC would occasionally split a session into the next week.
 */
function groupExpressions(groupBy: GroupBy, tzOffsetMinutes: number) {
    const local = `datetime(created_at, '${tzOffsetMinutes >= 0 ? '+' : '-'}${Math.abs(tzOffsetMinutes)} minutes')`;
    switch (groupBy) {
        case 'year':
            return { key: `strftime('%Y', ${local})`, start: `strftime('%Y-01-01', ${local})` };
        case 'month':
            return { key: `strftime('%Y-%m', ${local})`, start: `strftime('%Y-%m-01', ${local})` };
        case 'week':
            // Back up 6 days then jump forward to the next Monday: the ISO week start.
            return {
                key: `date(${local}, '-6 days', 'weekday 1')`,
                start: `date(${local}, '-6 days', 'weekday 1')`,
            };
    }
}

export async function listSessionGroups(params: {
    status: SessionStatus | 'all';
    page: number;
    pageSize: number;
    q: string;
    groupBy: GroupBy;
    tzOffsetMinutes: number;
}): Promise<SessionGroupPage> {
    const db = await getDb();
    const { key, start } = groupExpressions(params.groupBy, params.tzOffsetMinutes);
    const where = `${statusFilter(params.status)} AND COALESCE(created_by, '') LIKE ? ESCAPE '\\'`;
    const pattern = likePattern(params.q);

    const totals = await db.get<{ totalGroups: number; totalSessions: number }>(
        `SELECT COUNT(DISTINCT ${key}) AS totalGroups, COUNT(1) AS totalSessions
           FROM sessions WHERE ${where}`,
        pattern,
    );

    // Paginate over *groups*, not rows, so a week is never split across two pages and a
    // group header never repeats on the next one (Q73).
    const groupRows = await db.all<{ groupKey: string; startDate: string }[]>(
        `SELECT ${key} AS groupKey, MIN(${start}) AS startDate
           FROM sessions
          WHERE ${where}
       GROUP BY groupKey
       ORDER BY groupKey DESC
          LIMIT ? OFFSET ?`,
        pattern,
        params.pageSize,
        (params.page - 1) * params.pageSize,
    );

    const groups: SessionGroup[] = [];
    if (groupRows.length > 0) {
        const placeholders = groupRows.map(() => '?').join(', ');
        const sessionRows = await db.all<(SessionRow & { groupKey: string })[]>(
            `SELECT ${SESSION_COLUMNS}, ${key} AS groupKey
               FROM sessions
              WHERE ${where} AND ${key} IN (${placeholders})
           ORDER BY created_at DESC, id DESC`,
            pattern,
            ...groupRows.map(g => g.groupKey),
        );

        for (const group of groupRows) {
            groups.push({
                key: group.groupKey,
                startDate: group.startDate,
                sessions: sessionRows.filter(s => s.groupKey === group.groupKey).map(toSummary),
            });
        }
    }

    return {
        groups,
        page: params.page,
        pageSize: params.pageSize,
        totalGroups: totals?.totalGroups ?? 0,
        totalSessions: totals?.totalSessions ?? 0,
        groupBy: params.groupBy,
    };
}

export async function getSession(sessionId: number): Promise<SessionDetail> {
    const db = await getDb();
    const session = await loadSessionRow(db, sessionId);
    const rows = await db.all<PlayerRow[]>(
        `SELECT ${PLAYER_COLUMNS} FROM players WHERE session_id = ? ORDER BY id ASC`,
        sessionId,
    );
    return { ...toSummary(session), players: rows.map(toPlayer) };
}

/* -------------------------------------------------------------------------- */
/* Session lifecycle                                                           */
/* -------------------------------------------------------------------------- */

export async function createSession(params: { createdBy?: string }): Promise<number> {
    const db = await getDb();
    const result = await db.run(
        'INSERT INTO sessions (is_active, created_at, created_by) VALUES (1, ?, ?)',
        nowIso(),
        params.createdBy ?? null,
    );
    if (result.lastID === undefined) throw new Error('Insert did not return a session id');
    return result.lastID;
}

/**
 * The lifecycle is `open → ended → archived`, and archiving is reversible (Q10/Q11).
 *
 * Previously `archiveSession` performed no checks at all, so a live session with players
 * still at the table could be archived in one click with no way back.
 */
export async function updateSessionStatus(
    sessionId: number,
    status: SessionStatus,
): Promise<SessionSummary> {
    return withTransaction(async db => {
        const row = await loadSessionRow(db, sessionId);
        const current = statusOf(row);
        if (current === status) return toSummary(row);

        switch (status) {
            case 'ended': {
                if (current === 'archived') {
                    await db.run('UPDATE sessions SET deleted_at = NULL WHERE id = ?', sessionId);
                    break;
                }
                const active = await db.get<{ count: number }>(
                    'SELECT COUNT(1) AS count FROM players WHERE session_id = ? AND is_active = 1',
                    sessionId,
                );
                if ((active?.count ?? 0) > 0) {
                    throw badRequest(
                        'SESSION_HAS_ACTIVE_PLAYERS',
                        'Cash out every player before ending the session',
                    );
                }
                await db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', sessionId);
                break;
            }
            case 'archived': {
                if (current === 'open') {
                    throw conflict(
                        'SESSION_NOT_ENDED',
                        'End the session before archiving it — archiving is not a way to close a live game',
                    );
                }
                await db.run(
                    'UPDATE sessions SET deleted_at = ? WHERE id = ?',
                    nowIso(),
                    sessionId,
                );
                break;
            }
            case 'open': {
                if (current === 'archived') {
                    throw conflict(
                        'SESSION_ARCHIVED',
                        'Restore the session from the archive before reopening it',
                    );
                }
                await db.run('UPDATE sessions SET is_active = 1 WHERE id = ?', sessionId);
                break;
            }
        }

        return toSummary(await loadSessionRow(db, sessionId));
    });
}

/* -------------------------------------------------------------------------- */
/* Players                                                                     */
/* -------------------------------------------------------------------------- */

export async function addPlayer(params: {
    sessionId: number;
    name: string;
    initialBuyInCents: number;
}): Promise<number> {
    return withTransaction(async db => {
        await requireOpenSession(db, params.sessionId);
        const timestamp = nowIso();
        const buyIns: BuyInEntry[] = [
            { id: randomUUID(), amountCents: params.initialBuyInCents, createdAt: timestamp },
        ];
        const result = await db.run(
            `INSERT INTO players
                 (session_id, name, net_balance, buy_ins_log, credits_log, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, '[]', 1, ?, ?)`,
            params.sessionId,
            params.name,
            -params.initialBuyInCents,
            JSON.stringify(buyIns),
            timestamp,
            timestamp,
        );
        if (result.lastID === undefined) throw new Error('Insert did not return a player id');
        return result.lastID;
    });
}

/**
 * Removes a player added by mistake (Q7).
 *
 * Only allowed while they have nothing but their opening buy-in and no credits in either
 * direction, so removing a row can never silently vacate chips another player lent them.
 */
export async function removePlayer(params: { sessionId: number; playerId: number }): Promise<void> {
    return withTransaction(async db => {
        await requireOpenSession(db, params.sessionId);
        const row = await loadPlayerRow(db, params.sessionId, params.playerId);
        const player = toPlayer(row);

        if (!player.isActive) {
            throw conflict(
                'PLAYER_ALREADY_CASHED_OUT',
                'Undo the cash-out before removing this player',
            );
        }
        if (player.buyIns.length > 1 || player.credits.length > 0) {
            throw conflict(
                'PLAYER_HAS_MOVEMENTS',
                'This player has movements beyond their initial buy-in — undo those first',
            );
        }

        const lentTo = await db.get<{ count: number }>(
            `SELECT COUNT(1) AS count FROM players
              WHERE session_id = ? AND credits_log LIKE ?`,
            params.sessionId,
            `%"toPlayerId":${params.playerId}%`,
        );
        if ((lentTo?.count ?? 0) > 0) {
            throw conflict(
                'PLAYER_HAS_MOVEMENTS',
                'Another player has lent chips to this one — undo that credit first',
            );
        }

        await db.run('DELETE FROM players WHERE id = ?', params.playerId);
    });
}

/* -------------------------------------------------------------------------- */
/* Buy-ins                                                                     */
/* -------------------------------------------------------------------------- */

export async function registerBuyIn(params: {
    sessionId: number;
    playerId: number;
    amountCents: number;
}): Promise<string> {
    return withTransaction(async db => {
        await requireOpenSession(db, params.sessionId);
        const row = await loadPlayerRow(db, params.sessionId, params.playerId);
        const player = toPlayer(row);
        if (!player.isActive) {
            throw conflict(
                'PLAYER_ALREADY_CASHED_OUT',
                'This player has cashed out and cannot buy in again',
            );
        }

        const entry: BuyInEntry = {
            id: randomUUID(),
            amountCents: params.amountCents,
            createdAt: nowIso(),
        };
        await persistPlayer(
            db,
            player.id,
            [...player.buyIns, entry],
            player.credits,
            player.finalChipCountCents,
        );
        return entry.id;
    });
}

/** Finds the player holding a given buy-in entry, ignoring the halves of a credit. */
async function findBuyInOwner(db: Database, sessionId: number, entryId: string) {
    const rows = await db.all<PlayerRow[]>(
        `SELECT ${PLAYER_COLUMNS} FROM players WHERE session_id = ?`,
        sessionId,
    );
    for (const row of rows) {
        const player = toPlayer(row);
        const entry = player.buyIns.find(e => e.id === entryId);
        if (entry) return { player, entry };
    }
    throw notFound('ENTRY_NOT_FOUND', `Buy-in ${entryId} does not exist in session ${sessionId}`);
}

export async function updateBuyIn(params: {
    sessionId: number;
    entryId: string;
    amountCents: number;
}): Promise<void> {
    return withTransaction(async db => {
        await requireOpenSession(db, params.sessionId);
        const { player, entry } = await findBuyInOwner(db, params.sessionId, params.entryId);
        if (entry.creditId) {
            throw badRequest(
                'VALIDATION_FAILED',
                'This entry is the receiving half of a credit — edit the credit instead',
            );
        }
        const buyIns = player.buyIns.map(e =>
            e.id === params.entryId ? { ...e, amountCents: params.amountCents } : e,
        );
        await persistPlayer(db, player.id, buyIns, player.credits, player.finalChipCountCents);
    });
}

export async function deleteBuyIn(params: { sessionId: number; entryId: string }): Promise<void> {
    return withTransaction(async db => {
        await requireOpenSession(db, params.sessionId);
        const { player, entry } = await findBuyInOwner(db, params.sessionId, params.entryId);
        if (entry.creditId) {
            throw badRequest(
                'VALIDATION_FAILED',
                'This entry is the receiving half of a credit — delete the credit instead',
            );
        }
        if (player.buyIns.length === 1) {
            throw conflict(
                'PLAYER_HAS_MOVEMENTS',
                'A player must keep at least one buy-in — remove the player instead',
            );
        }
        const buyIns = player.buyIns.filter(e => e.id !== params.entryId);
        await persistPlayer(db, player.id, buyIns, player.credits, player.finalChipCountCents);
    });
}

/* -------------------------------------------------------------------------- */
/* Credits                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Records chips lent from one player to another.
 *
 * The credit lands in the provider's credit log and, per Q4 (confirmed intended), in the
 * receiver's buy-in log — the table is treated as the counterparty, so nobody ends up
 * owing another player directly. Both halves carry the same `creditId` so a correction
 * can move them together.
 */
export async function registerCredit(params: {
    sessionId: number;
    providerId: number;
    receiverId: number;
    amountCents: number;
}): Promise<string> {
    if (params.providerId === params.receiverId) {
        // Also rejected by the zod schema; kept here so the invariant holds for any caller.
        throw badRequest('SELF_CREDIT_NOT_ALLOWED', 'A player cannot give a credit to themselves');
    }

    return withTransaction(async db => {
        await requireOpenSession(db, params.sessionId);
        const provider = toPlayer(await loadPlayerRow(db, params.sessionId, params.providerId));
        const receiver = toPlayer(await loadPlayerRow(db, params.sessionId, params.receiverId));

        if (!provider.isActive || !receiver.isActive) {
            throw conflict(
                'CREDIT_RECEIVER_CASHED_OUT',
                'Both players must still be at the table to move chips between them',
            );
        }

        const creditId = randomUUID();
        const timestamp = nowIso();

        const credit: CreditEntry = {
            id: creditId,
            creditId,
            toPlayerId: receiver.id,
            amountCents: params.amountCents,
            createdAt: timestamp,
        };
        const received: BuyInEntry = {
            id: randomUUID(),
            amountCents: params.amountCents,
            createdAt: timestamp,
            creditId,
            fromPlayerId: provider.id,
        };

        await persistPlayer(
            db,
            provider.id,
            provider.buyIns,
            [...provider.credits, credit],
            provider.finalChipCountCents,
        );
        await persistPlayer(
            db,
            receiver.id,
            [...receiver.buyIns, received],
            receiver.credits,
            receiver.finalChipCountCents,
        );
        return creditId;
    });
}

async function loadCreditSides(db: Database, sessionId: number, creditId: string) {
    const rows = await db.all<PlayerRow[]>(
        `SELECT ${PLAYER_COLUMNS} FROM players WHERE session_id = ?`,
        sessionId,
    );
    const players = rows.map(toPlayer);
    const provider = players.find(p => p.credits.some(c => c.creditId === creditId));
    const receiver = players.find(p => p.buyIns.some(b => b.creditId === creditId));
    if (!provider || !receiver) {
        throw notFound(
            'ENTRY_NOT_FOUND',
            `Credit ${creditId} does not exist in session ${sessionId}`,
        );
    }
    return { provider, receiver };
}

export async function updateCredit(params: {
    sessionId: number;
    creditId: string;
    amountCents: number;
}): Promise<void> {
    return withTransaction(async db => {
        await requireOpenSession(db, params.sessionId);
        const { provider, receiver } = await loadCreditSides(db, params.sessionId, params.creditId);

        await persistPlayer(
            db,
            provider.id,
            provider.buyIns,
            provider.credits.map(c =>
                c.creditId === params.creditId ? { ...c, amountCents: params.amountCents } : c,
            ),
            provider.finalChipCountCents,
        );
        await persistPlayer(
            db,
            receiver.id,
            receiver.buyIns.map(b =>
                b.creditId === params.creditId ? { ...b, amountCents: params.amountCents } : b,
            ),
            receiver.credits,
            receiver.finalChipCountCents,
        );
    });
}

export async function deleteCredit(params: { sessionId: number; creditId: string }): Promise<void> {
    return withTransaction(async db => {
        await requireOpenSession(db, params.sessionId);
        const { provider, receiver } = await loadCreditSides(db, params.sessionId, params.creditId);

        await persistPlayer(
            db,
            provider.id,
            provider.buyIns,
            provider.credits.filter(c => c.creditId !== params.creditId),
            provider.finalChipCountCents,
        );
        await persistPlayer(
            db,
            receiver.id,
            receiver.buyIns.filter(b => b.creditId !== params.creditId),
            receiver.credits,
            receiver.finalChipCountCents,
        );
    });
}

/* -------------------------------------------------------------------------- */
/* Cash-out                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Settles a player: `payout = finalChipCount + netBalance`.
 *
 * Positive means the house pays them that much; negative means they owe the house
 * (Q2 — buy-ins are frequently not paid on sitting down, so this is the amount that
 * actually changes hands at the end of the night).
 */
export async function cashOut(params: {
    sessionId: number;
    playerId: number;
    finalChipCountCents: number;
}): Promise<number> {
    return withTransaction(async db => {
        await requireOpenSession(db, params.sessionId);
        const player = toPlayer(await loadPlayerRow(db, params.sessionId, params.playerId));

        // Q38: without this, a second call silently rewrote the settled result.
        if (!player.isActive) {
            throw conflict('PLAYER_ALREADY_CASHED_OUT', 'This player has already cashed out');
        }

        const payoutCents = await persistPlayer(
            db,
            player.id,
            player.buyIns,
            player.credits,
            params.finalChipCountCents,
        );
        await db.run(
            'UPDATE players SET is_active = 0, final_chip_count = ? WHERE id = ?',
            params.finalChipCountCents,
            player.id,
        );
        if (payoutCents === null) throw new Error('Cash-out did not produce a payout');
        return payoutCents;
    });
}

export async function undoCashOut(params: { sessionId: number; playerId: number }): Promise<void> {
    return withTransaction(async db => {
        await requireOpenSession(db, params.sessionId);
        const row = await loadPlayerRow(db, params.sessionId, params.playerId);
        if (row.isActive === 1) {
            throw conflict('PLAYER_NOT_CASHED_OUT', 'This player is still at the table');
        }
        await db.run(
            `UPDATE players
                SET is_active = 1, final_chip_count = NULL, payout = NULL, updated_at = ?
              WHERE id = ?`,
            nowIso(),
            params.playerId,
        );
    });
}

export { AppError };
