import bcrypt from 'bcrypt';
import { getDb } from '../lib/db.js';

export async function createUser({ email, password, role = 'user' }) {
	const db = await getDb();
	const passwordHash = await bcrypt.hash(password, 10);
	const normalizedEmail = String(email).trim().toLowerCase();

	const res = await db.run(`INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now'))`, normalizedEmail, passwordHash, role);
	return res.lastID;
}

export async function verifyUser({ email, password }) {
	const db = await getDb();
    const user = await db.get(`SELECT id, email, password_hash as hash, role FROM users WHERE email = ?`, email);

    if (!user) return null;

	const ok = await bcrypt.compare(password, user.hash);
	return ok ? { id: user.id, email: user.email, role: user.role } : null;
}