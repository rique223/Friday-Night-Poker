import fs from 'node:fs';
import path from 'node:path';

import { type Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

import { config } from '../config.js';

import { migrations } from './migrations.js';

let dbInstance: Database | undefined;

async function applyMigrations(db: Database): Promise<void> {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );
    `);

    const applied = await db.all<{ id: number }[]>('SELECT id FROM schema_migrations');
    const appliedIds = new Set(applied.map(r => r.id));
    const pending = migrations.filter(m => !appliedIds.has(m.id)).sort((a, b) => a.id - b.id);
    if (pending.length === 0) return;

    // `PRAGMA foreign_keys` is a no-op inside a transaction, and migration 5 rebuilds a
    // table, so enforcement is disabled for the duration and re-enabled afterwards.
    await db.exec('PRAGMA foreign_keys = OFF');
    try {
        for (const migration of pending) {
            console.log(`migration: applying ${migration.id}_${migration.name}`);
            await db.exec('BEGIN');
            try {
                await migration.up(db);
                await db.run(
                    'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)',
                    migration.id,
                    migration.name,
                    `${new Date().toISOString().slice(0, 19)}Z`,
                );
                await db.exec('COMMIT');
            } catch (error) {
                await db.exec('ROLLBACK');
                throw new Error(
                    `Migration ${migration.id}_${migration.name} failed: ${String(error)}`,
                    { cause: error },
                );
            }
        }
    } finally {
        await db.exec('PRAGMA foreign_keys = ON');
    }

    const violations = await db.all('PRAGMA foreign_key_check');
    if (violations.length > 0) {
        throw new Error(`Foreign key violations after migration: ${JSON.stringify(violations)}`);
    }
}

export async function initDb(): Promise<Database> {
    if (dbInstance) return dbInstance;

    fs.mkdirSync(config.dataDir, { recursive: true });

    const db = await open({
        filename: path.join(config.dataDir, 'poker.sqlite'),
        driver: sqlite3.Database,
    });

    await db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
    `);

    await applyMigrations(db);

    dbInstance = db;
    return db;
}

export async function getDb(): Promise<Database> {
    return dbInstance ?? initDb();
}

export async function closeDb(): Promise<void> {
    if (!dbInstance) return;
    // Fold the WAL back into the main file so a backup of poker.sqlite alone is complete.
    await dbInstance.exec('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => undefined);
    await dbInstance.close();
    dbInstance = undefined;
}

/**
 * Serialises write transactions over the single shared connection.
 *
 * SQLite has no nested transactions, so two overlapping `BEGIN`s on one connection
 * either error or silently merge — and a `ROLLBACK` from either would abort both.
 * The queue makes multi-statement writes (a credit touches two rows) all-or-nothing
 * even if a request arrives while another is mid-flight.
 */
let queue: Promise<unknown> = Promise.resolve();

export function withTransaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
        const db = await getDb();
        await db.exec('BEGIN IMMEDIATE');
        try {
            const result = await fn(db);
            await db.exec('COMMIT');
            return result;
        } catch (error) {
            await db.exec('ROLLBACK').catch(() => undefined);
            throw error;
        }
    };

    const result = queue.then(run, run);
    queue = result.catch(() => undefined);
    return result;
}

/** Drops and recreates all game data. Only reachable behind the dev-route guard (Q12). */
export async function resetGameData(): Promise<void> {
    const db = await getDb();
    await db.exec('DELETE FROM players; DELETE FROM sessions;');
}
