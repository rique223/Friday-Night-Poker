import fs from 'fs';
import path from 'path';

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

let dbInstance;

async function createSchema(db) {
    await db.exec(`
    PRAGMA journal_mode = WAL;

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
    CREATE INDEX IF NOT EXISTS idx_players_session ON players(session_id);

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

export async function initDb() {
    if (dbInstance) return dbInstance;

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbFile = path.join(dataDir, 'poker.sqlite');
    const db = await open({ filename: dbFile, driver: sqlite3.Database });
    await createSchema(db);
    dbInstance = db;

    const cols = await db.all('PRAGMA table_info(sessions)');
    if (!cols.some(c => c.name === 'deleted_at')) {
        await db.exec('ALTER TABLE sessions ADD COLUMN deleted_at TEXT');
    }

    return dbInstance;
}

export async function getDb() {
    if (!dbInstance) {
        await initDb();
    }
    return dbInstance;
}

export async function resetDb() {
    const db = await getDb();
    await db.exec(`
    DROP TABLE IF EXISTS players;
    DROP TABLE IF EXISTS sessions;
  `);
    await createSchema(db);
}
