import { getDb, resetDb as resetDbImpl } from '../lib/db.js';

async function assertSessionActive(db, sessionId) {
	const row = await db.get(`SELECT is_active as isActive FROM sessions WHERE id = ?`, sessionId);
	if (!row) {
		const err = new Error('Session not found');
		err.status = 404;
		throw err;
	}
	if (Number(row.isActive) !== 1) {
		const err = new Error('Session has ended');
		err.status = 400;
		throw err;
	}
}

export async function createSession({ createdBy }) {
	const db = await getDb();
	const result = await db.run(
		`INSERT INTO sessions (is_active, created_at, created_by) VALUES (1, datetime('now'), ?)`,
		createdBy ?? null,
	);
	return result.lastID;
}

export async function listSessions({ page, pageSize, q, archived }) {
	const db = await getDb();
	const offset = (page - 1) * pageSize;
	const filter = `%${q.trim()}%`;
	const where = archived ? `deleted_at IS NOT NULL` : `deleted_at IS NULL`;
	const itemsRaw = await db.all(
		`SELECT id, is_active as isActive, created_at as createdAt, created_by as createdBy
       FROM sessions
      WHERE ${where} AND COALESCE(created_by, '') LIKE ?
      ORDER BY datetime(created_at) DESC
      LIMIT ? OFFSET ?`,
		filter,
		pageSize,
		offset,
	);
	const items = itemsRaw.map((s) => ({ ...s, isActive: Number(s.isActive) === 1 }));
	const { count } = await db.get(`SELECT COUNT(1) as count FROM sessions WHERE ${where} AND COALESCE(created_by, '') LIKE ?`, filter);
	return { items, total: count };
}

export async function getSession(sessionId) {
	const db = await getDb();
	const sessionRow = await db.get(`SELECT id, is_active as isActive, created_at as createdAt FROM sessions WHERE id = ?`, sessionId);
	if (!sessionRow) return null;
	const session = { ...sessionRow, isActive: Number(sessionRow.isActive) === 1 };
	const rows = await db.all(
		`SELECT id, name, net_balance as netBalance, buy_ins_log as buyInsLog, credits_log as creditsLog, is_active as isActive,
            final_chip_count as finalChipCount, payout, updated_at as updatedAt
       FROM players WHERE session_id = ? ORDER BY id ASC`,
		sessionId,
	);
	const players = rows.map((p) => {
		const buyIns = safeParseJsonArray(p.buyInsLog);
		const credits = safeParseJsonArray(p.creditsLog);
		const totalBuyIns = buyIns.reduce((s, x) => s + Number(x.amount || 0), 0);
		const totalCredits = credits.reduce((s, x) => s + Number(x.amount || 0), 0);
		return { ...p, isActive: Number(p.isActive) === 1, buyInsLog: buyIns, creditsLog: credits, totalBuyIns, totalCredits };
	});
	return { ...session, players };
}

export async function endSession(sessionId) {
	const db = await getDb();
	const { cnt } = await db.get(`SELECT COUNT(1) as cnt FROM players WHERE session_id = ? AND is_active = 1`, sessionId);
	if (Number(cnt) > 0) {
		const err = new Error('Cannot end session while there are active players. Cash out all players first.');
		err.status = 400;
		throw err;
	}
	const existing = await db.get(`SELECT id FROM sessions WHERE id = ?`, sessionId);
	if (!existing) {
		const err = new Error('Session not found');
		err.status = 404;
		throw err;
	}
	await db.run(`UPDATE sessions SET is_active = 0 WHERE id = ?`, sessionId);
}

export async function archiveSession(sessionId) {
	const db = await getDb();
	const existing = await db.get(`SELECT id FROM sessions WHERE id = ?`, sessionId);
	if (!existing) {
		const err = new Error('Session not found');
		err.status = 404;
		throw err;
	}
	await db.run(`UPDATE sessions SET deleted_at = datetime('now') WHERE id = ?`, sessionId);
}

export async function addPlayer({ sessionId, name, initialBuyIn }) {
	const db = await getDb();
	await assertSessionActive(db, sessionId);
	const buyInEntry = { amount: initialBuyIn, timestamp: new Date().toISOString() };
	const result = await db.run(
		`INSERT INTO players (session_id, name, net_balance, buy_ins_log, credits_log, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
		sessionId,
		name,
		-initialBuyIn,
		JSON.stringify([buyInEntry]),
		JSON.stringify([]),
	);
	return result.lastID;
}

export async function listPlayers(sessionId) {
	const db = await getDb();
	const rows = await db.all(
		`SELECT id, name, net_balance as netBalance, buy_ins_log as buyInsLog, credits_log as creditsLog, is_active as isActive,
            final_chip_count as finalChipCount, payout, updated_at as updatedAt
       FROM players WHERE session_id = ? ORDER BY id ASC`,
		sessionId,
	);
	return rows.map((p) => {
		const buyIns = safeParseJsonArray(p.buyInsLog);
		const credits = safeParseJsonArray(p.creditsLog);
		const totalBuyIns = buyIns.reduce((s, x) => s + Number(x.amount || 0), 0);
		const totalCredits = credits.reduce((s, x) => s + Number(x.amount || 0), 0);
		return { ...p, isActive: Number(p.isActive) === 1, buyInsLog: buyIns, creditsLog: credits, totalBuyIns, totalCredits };
	});
}

export async function registerBuyIn({ sessionId, playerId, amount }) {
	const db = await getDb();
	await assertSessionActive(db, sessionId);
	const player = await db.get(
		`SELECT buy_ins_log as buyInsLog, net_balance as netBalance FROM players WHERE id = ? AND session_id = ?`,
		playerId,
		sessionId,
	);
	if (!player) {
		const err = new Error('Player not found');
		err.status = 404;
		throw err;
	}
	const log = safeParseJsonArray(player.buyInsLog);
	log.push({ amount, timestamp: new Date().toISOString() });
	await db.run(
		`UPDATE players SET net_balance = ?, buy_ins_log = ?, updated_at = datetime('now') WHERE id = ?`,
		player.netBalance - amount,
		JSON.stringify(log),
		playerId,
	);
}

export async function registerCredit({ sessionId, providerId, receiverId, amount }) {
	const db = await getDb();
	await assertSessionActive(db, sessionId);
	await db.exec('BEGIN');
	try {
		const provider = await db.get(
			`SELECT id, credits_log as creditsLog, net_balance as netBalance FROM players WHERE id = ? AND session_id = ?`,
			providerId,
			sessionId,
		);
		if (!provider) {
			const err = new Error('Provider not found in this session');
			err.status = 404;
			throw err;
		}

		const receiver = await db.get(
			`SELECT id, buy_ins_log as buyInsLog, net_balance as netBalance FROM players WHERE id = ? AND session_id = ?`,
			receiverId,
			sessionId,
		);
		if (!receiver) {
			const err = new Error('Receiver not found in this session');
			err.status = 404;
			throw err;
		}

		const providerCredits = safeParseJsonArray(provider.creditsLog);
		providerCredits.push({ amount, receiverId, timestamp: new Date().toISOString() });
		await db.run(
			`UPDATE players SET net_balance = ?, credits_log = ?, updated_at = datetime('now') WHERE id = ?`,
			provider.netBalance + amount,
			JSON.stringify(providerCredits),
			providerId,
		);

		const receiverBuyIns = safeParseJsonArray(receiver.buyInsLog);
		receiverBuyIns.push({ amount, timestamp: new Date().toISOString() });
		await db.run(
			`UPDATE players SET net_balance = ?, buy_ins_log = ?, updated_at = datetime('now') WHERE id = ?`,
			receiver.netBalance - amount,
			JSON.stringify(receiverBuyIns),
			receiverId,
		);

		await db.exec('COMMIT');
	} catch (e) {
		await db.exec('ROLLBACK');
		throw e;
	}
}

export async function cashOut({ sessionId, playerId, finalChipCount }) {
	const db = await getDb();
	await assertSessionActive(db, sessionId);
	const player = await db.get(`SELECT net_balance as netBalance FROM players WHERE id = ? AND session_id = ?`, playerId, sessionId);
	if (!player) {
		const err = new Error('Player not found');
		err.status = 404;
		throw err;
	}
	const payout = finalChipCount + Number(player.netBalance);
	await db.run(
		`UPDATE players SET is_active = 0, final_chip_count = ?, payout = ?, updated_at = datetime('now') WHERE id = ?`,
		finalChipCount,
		payout,
		playerId,
	);
	return payout;
}

export async function resetDb() {
	await resetDbImpl();
}

function safeParseJsonArray(value) {
	try {
		const parsed = JSON.parse(value || '[]');
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
