import { randomUUID } from 'node:crypto';

import type { Database } from 'sqlite';

import { toIsoUtc } from '../lib/time.js';

/**
 * A numbered, recorded migration list replacing the single ad-hoc `PRAGMA table_info`
 * check that used to live in `initDb` (Q30).
 *
 * Migrations run once, in order, inside a transaction, and are recorded in
 * `schema_migrations`. They must never be edited after being applied — add a new one.
 */
export interface Migration {
    id: number;
    name: string;
    up: (db: Database) => Promise<void>;
}

interface LegacyLogEntry {
    amount?: number;
    amountCents?: number;
    timestamp?: string;
    createdAt?: string;
    receiverId?: number;
    toPlayerId?: number;
    id?: string;
    creditId?: string;
}

interface CreditEntryShape {
    id: string;
    creditId: string;
    toPlayerId: number;
    amountCents: number;
    createdAt: string;
}

function parseArray(value: unknown): LegacyLogEntry[] {
    if (typeof value !== 'string') return [];
    try {
        const parsed: unknown = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? (parsed as LegacyLogEntry[]) : [];
    } catch {
        return [];
    }
}

export const migrations: Migration[] = [
    {
        id: 1,
        name: 'baseline',
        // Matches the schema `createSchema` used to produce, so an existing database
        // and a brand-new one converge on the same starting point.
        up: async db => {
            await db.exec(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    created_by TEXT,
                    deleted_at TEXT
                );

                CREATE TABLE IF NOT EXISTS players (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    net_balance INTEGER NOT NULL DEFAULT 0,
                    buy_ins_log TEXT NOT NULL DEFAULT '[]',
                    credits_log TEXT NOT NULL DEFAULT '[]',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    final_chip_count INTEGER,
                    payout INTEGER,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES sessions(id)
                );

                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    created_at TEXT NOT NULL
                );
            `);
            // The pre-migration codebase added this column ad hoc; older databases may
            // predate it, and `ALTER TABLE ... ADD COLUMN` has no IF NOT EXISTS.
            const cols = await db.all<{ name: string }[]>('PRAGMA table_info(sessions)');
            if (!cols.some(c => c.name === 'deleted_at')) {
                await db.exec('ALTER TABLE sessions ADD COLUMN deleted_at TEXT');
            }
        },
    },

    {
        id: 2,
        name: 'iso_utc_timestamps',
        up: async db => {
            const fix = async (table: string, columns: string[]) => {
                const rows = await db.all<Record<string, unknown>[]>(
                    `SELECT id, ${columns.join(', ')} FROM ${table}`,
                );
                for (const row of rows) {
                    const sets: string[] = [];
                    const values: unknown[] = [];
                    for (const col of columns) {
                        const current = row[col];
                        if (typeof current !== 'string' || current === '') continue;
                        const normalised = toIsoUtc(current);
                        if (normalised !== current) {
                            sets.push(`${col} = ?`);
                            values.push(normalised);
                        }
                    }
                    if (sets.length > 0) {
                        await db.run(
                            `UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`,
                            ...values,
                            row['id'],
                        );
                    }
                }
            };

            await fix('sessions', ['created_at', 'deleted_at']);
            await fix('players', ['created_at', 'updated_at']);
            await fix('users', ['created_at']);
        },
    },

    {
        id: 3,
        name: 'money_to_integer_cents',
        // Q28: everything monetary becomes integer cents so no float arithmetic can
        // produce 299.99999999999994 on a payout.
        up: async db => {
            await db.exec(`
                UPDATE players SET
                    net_balance      = CAST(ROUND(net_balance * 100) AS INTEGER),
                    final_chip_count = CASE WHEN final_chip_count IS NULL THEN NULL
                                            ELSE CAST(ROUND(final_chip_count * 100) AS INTEGER) END,
                    payout           = CASE WHEN payout IS NULL THEN NULL
                                            ELSE CAST(ROUND(payout * 100) AS INTEGER) END;
            `);

            const rows = await db.all<{ id: number; buy_ins_log: string; credits_log: string }[]>(
                'SELECT id, buy_ins_log, credits_log FROM players',
            );
            for (const row of rows) {
                const scale = (entries: LegacyLogEntry[]) =>
                    entries.map(e => ({ ...e, amount: Math.round(Number(e.amount ?? 0) * 100) }));
                await db.run(
                    'UPDATE players SET buy_ins_log = ?, credits_log = ? WHERE id = ?',
                    JSON.stringify(scale(parseArray(row.buy_ins_log))),
                    JSON.stringify(scale(parseArray(row.credits_log))),
                    row.id,
                );
            }
        },
    },

    {
        id: 4,
        name: 'identified_log_entries',
        // Q7: every movement gets a stable id so it can be corrected or undone.
        //
        // The two halves of a credit have to end up sharing a `creditId`, but legacy rows
        // recorded them independently: the provider got `{amount, receiverId, timestamp}`
        // in credits_log and the receiver got a bare `{amount, timestamp}` in buy_ins_log,
        // with nothing linking them but an identical timestamp. This pass rebuilds that
        // link so an existing credit can still be corrected or undone.
        up: async db => {
            const rows = await db.all<
                { id: number; buy_ins_log: string; credits_log: string; created_at: string }[]
            >('SELECT id, buy_ins_log, credits_log, created_at FROM players');

            /** Credits owed *to* a player, keyed so the matching buy-in can claim one. */
            const incoming = new Map<string, { creditId: string; fromPlayerId: number }[]>();
            const creditsByPlayer = new Map<number, CreditEntryShape[]>();

            for (const row of rows) {
                const fallbackTime = toIsoUtc(row.created_at);
                const credits = parseArray(row.credits_log).map(entry => {
                    const creditId = entry.creditId ?? randomUUID();
                    const credit: CreditEntryShape = {
                        id: entry.id ?? creditId,
                        creditId,
                        toPlayerId: entry.toPlayerId ?? entry.receiverId ?? 0,
                        amountCents: entry.amountCents ?? entry.amount ?? 0,
                        createdAt: toIsoUtc(entry.createdAt ?? entry.timestamp ?? fallbackTime),
                    };
                    const key = `${credit.toPlayerId}|${credit.amountCents}|${credit.createdAt}`;
                    const bucket = incoming.get(key) ?? [];
                    bucket.push({ creditId, fromPlayerId: row.id });
                    incoming.set(key, bucket);
                    return credit;
                });
                creditsByPlayer.set(row.id, credits);
            }

            for (const row of rows) {
                const fallbackTime = toIsoUtc(row.created_at);
                const buyIns = parseArray(row.buy_ins_log).map(entry => {
                    const amountCents = entry.amountCents ?? entry.amount ?? 0;
                    const createdAt = toIsoUtc(entry.createdAt ?? entry.timestamp ?? fallbackTime);
                    const base = { id: entry.id ?? randomUUID(), amountCents, createdAt };

                    if (entry.creditId) return { ...base, creditId: entry.creditId };

                    // Each recorded credit can only be claimed by one buy-in, so a player
                    // who received two identical credits still ends up with two links.
                    const match = incoming.get(`${row.id}|${amountCents}|${createdAt}`)?.shift();
                    return match
                        ? { ...base, creditId: match.creditId, fromPlayerId: match.fromPlayerId }
                        : base;
                });

                await db.run(
                    'UPDATE players SET buy_ins_log = ?, credits_log = ? WHERE id = ?',
                    JSON.stringify(buyIns),
                    JSON.stringify(creditsByPlayer.get(row.id) ?? []),
                    row.id,
                );
            }
        },
    },

    {
        id: 5,
        name: 'foreign_keys_and_indexes',
        // Q26: the FK was declared but unenforceable without a cascade rule and without
        // `PRAGMA foreign_keys = ON` (now set on every connection).
        // Q34: index what the list query actually filters and sorts on, and drop the
        // index that duplicates the UNIQUE constraint's automatic one.
        up: async db => {
            await db.exec(`
                CREATE TABLE players_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    net_balance INTEGER NOT NULL DEFAULT 0,
                    buy_ins_log TEXT NOT NULL DEFAULT '[]',
                    credits_log TEXT NOT NULL DEFAULT '[]',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    final_chip_count INTEGER,
                    payout INTEGER,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                INSERT INTO players_new
                    SELECT id, session_id, name, net_balance, buy_ins_log, credits_log,
                           is_active, final_chip_count, payout, created_at, updated_at
                      FROM players;

                DROP TABLE players;
                ALTER TABLE players_new RENAME TO players;

                DROP INDEX IF EXISTS idx_users_email;
                DROP INDEX IF EXISTS idx_players_session;

                CREATE INDEX idx_players_session ON players(session_id);
                CREATE INDEX idx_sessions_deleted_created ON sessions(deleted_at, created_at DESC);
            `);
        },
    },
];
