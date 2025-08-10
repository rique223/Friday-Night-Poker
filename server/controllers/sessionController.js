import * as service from '../services/sessionService.js';

export async function createSession(req, res) {
  const { createdBy } = req.body || {};
  const sessionId = await service.createSession({ createdBy });
  res.status(201).json({ success: true, data: { sessionId } });
}

export async function listSessions(req, res) {
  const { page = 1, pageSize = 10, q = '' } = req.query;
  const result = await service.listSessions({ page: Number(page), pageSize: Number(pageSize), q: String(q), archived: false });
  res.status(200).json({ success: true, data: result });
}

export async function getSession(req, res) {
  const sessionId = Number(req.params.sessionId);
  const result = await service.getSession(sessionId);
  if (!result) return res.status(404).json({ success: false, error: 'Session not found' });
  res.status(200).json({ success: true, data: result });
}

export async function endSession(req, res) {
  const sessionId = Number(req.params.sessionId);
  await service.endSession(sessionId);
  res.status(200).json({ success: true, data: { isActive: false } });
}

export async function archiveSession(req, res) {
  const sessionId = Number(req.params.sessionId);
  await service.archiveSession(sessionId);
  res.status(200).json({ success: true });
}

export async function listArchived(req, res) {
  const { page = 1, pageSize = 10, q = '' } = req.query;
  const result = await service.listSessions({ page: Number(page), pageSize: Number(pageSize), q: String(q), archived: true });
  res.status(200).json({ success: true, data: result });
}

export async function addPlayer(req, res) {
  const sessionId = Number(req.params.sessionId);
  const { name, initialBuyIn } = req.body || {};
  if (!name || typeof initialBuyIn !== 'number') {
    const err = new Error('name and initialBuyIn (number) required');
    err.status = 400; throw err;
  }
  const playerId = await service.addPlayer({ sessionId, name, initialBuyIn });
  res.status(201).json({ success: true, data: { playerId } });
}

export async function listPlayers(req, res) {
  const sessionId = Number(req.params.sessionId);
  const items = await service.listPlayers(sessionId);
  res.status(200).json({ success: true, data: items });
}

export async function registerBuyIn(req, res) {
  const sessionId = Number(req.params.sessionId);
  const { playerId, amount } = req.body || {};
  if (typeof playerId !== 'number' || typeof amount !== 'number' || amount <= 0) {
    const err = new Error('playerId and positive amount are required');
    err.status = 400; throw err;
  }
  await service.registerBuyIn({ sessionId, playerId, amount });
  res.status(200).json({ success: true });
}

export async function registerCredit(req, res) {
  const sessionId = Number(req.params.sessionId);
  const { providerId, receiverId, amount } = req.body || {};
  if (typeof providerId !== 'number' || typeof receiverId !== 'number' || typeof amount !== 'number' || amount <= 0) {
    const err = new Error('providerId, receiverId and positive amount are required');
    err.status = 400; throw err;
  }
  await service.registerCredit({ sessionId, providerId, receiverId, amount });
  res.status(200).json({ success: true });
}

export async function cashOut(req, res) {
  const sessionId = Number(req.params.sessionId);
  const { playerId, finalChipCount } = req.body || {};
  if (typeof playerId !== 'number' || typeof finalChipCount !== 'number') {
    const err = new Error('playerId and finalChipCount (number) are required');
    err.status = 400; throw err;
  }
  const payout = await service.cashOut({ sessionId, playerId, finalChipCount });
  res.status(200).json({ success: true, data: { payout } });
}

export async function resetDb(_req, res) {
  await service.resetDb();
  res.status(200).json({ success: true });
}


