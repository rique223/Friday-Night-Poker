import bcrypt from 'bcrypt';

import { getDb } from '../db/index.js';
import { nowIso } from '../lib/time.js';

const BCRYPT_ROUNDS = 10;

/**
 * A precomputed hash of a value nobody can supply, compared against when the email is
 * unknown so a failed lookup costs the same as a wrong password (Q21). Without it,
 * "unknown email" answered in ~1 ms and "known email" in ~100 ms, which is enough to
 * enumerate accounts.
 */
const DUMMY_HASH = bcrypt.hashSync('user-does-not-exist', BCRYPT_ROUNDS);

export interface AuthenticatedUser {
    id: number;
    email: string;
    role: string;
}

/**
 * The single definition of how an email is keyed.
 *
 * `createUser` used to lowercase while `verifyUser` queried the raw input, so an account
 * created as `Henrique@Gmail.com` could never be logged into by typing it that way — and
 * phone keyboards autocapitalise the first letter (Q13).
 */
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export async function createUser(params: {
    email: string;
    password: string;
    role?: string;
}): Promise<number> {
    const db = await getDb();
    const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
    const result = await db.run(
        'INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)',
        normalizeEmail(params.email),
        passwordHash,
        params.role ?? 'admin',
        nowIso(),
    );
    if (result.lastID === undefined) throw new Error('Insert did not return a user id');
    return result.lastID;
}

export async function verifyUser(params: {
    email: string;
    password: string;
}): Promise<AuthenticatedUser | null> {
    const db = await getDb();
    const user = await db.get<{ id: number; email: string; hash: string; role: string }>(
        'SELECT id, email, password_hash AS hash, role FROM users WHERE email = ?',
        normalizeEmail(params.email),
    );

    const matches = await bcrypt.compare(params.password, user?.hash ?? DUMMY_HASH);
    if (!user || !matches) return null;

    return { id: user.id, email: user.email, role: user.role };
}
