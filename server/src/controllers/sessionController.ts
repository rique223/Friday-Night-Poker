import type { Request, Response } from 'express';
import type {
    AddPlayerBody,
    BuyInBody,
    CashOutBody,
    CreateSessionBody,
    CreditBody,
    ListSessionsQuery,
    UpdateAmountBody,
    UpdateSessionBody,
} from '@fnp/shared';

import { validated } from '../middleware/validate.js';
import * as service from '../services/sessionService.js';

type SessionParams = { sessionId: number };
type PlayerParams = SessionParams & { playerId: number };
type EntryParams = SessionParams & { entryId: string };

export async function listSessions(req: Request, res: Response): Promise<void> {
    const { query } = validated<unknown, unknown, ListSessionsQuery>(req);
    res.json({ success: true, data: await service.listSessionGroups(query) });
}

export async function createSession(req: Request, res: Response): Promise<void> {
    const { body } = validated<unknown, CreateSessionBody, unknown>(req);
    const sessionId = await service.createSession(body);
    res.status(201).json({ success: true, data: { sessionId } });
}

export async function getSession(req: Request, res: Response): Promise<void> {
    const { params } = validated<SessionParams, unknown, unknown>(req);
    res.json({ success: true, data: await service.getSession(params.sessionId) });
}

export async function updateSession(req: Request, res: Response): Promise<void> {
    const { params, body } = validated<SessionParams, UpdateSessionBody, unknown>(req);
    const session = await service.updateSessionStatus(params.sessionId, body.status);
    res.json({ success: true, data: session });
}

export async function addPlayer(req: Request, res: Response): Promise<void> {
    const { params, body } = validated<SessionParams, AddPlayerBody, unknown>(req);
    const playerId = await service.addPlayer({ sessionId: params.sessionId, ...body });
    res.status(201).json({ success: true, data: { playerId } });
}

export async function removePlayer(req: Request, res: Response): Promise<void> {
    const { params } = validated<PlayerParams, unknown, unknown>(req);
    await service.removePlayer(params);
    res.status(204).end();
}

export async function registerBuyIn(req: Request, res: Response): Promise<void> {
    const { params, body } = validated<SessionParams, BuyInBody, unknown>(req);
    const entryId = await service.registerBuyIn({ sessionId: params.sessionId, ...body });
    res.status(201).json({ success: true, data: { entryId } });
}

export async function updateBuyIn(req: Request, res: Response): Promise<void> {
    const { params, body } = validated<EntryParams, UpdateAmountBody, unknown>(req);
    await service.updateBuyIn({ ...params, amountCents: body.amountCents });
    res.json({ success: true });
}

export async function deleteBuyIn(req: Request, res: Response): Promise<void> {
    const { params } = validated<EntryParams, unknown, unknown>(req);
    await service.deleteBuyIn(params);
    res.status(204).end();
}

export async function registerCredit(req: Request, res: Response): Promise<void> {
    const { params, body } = validated<SessionParams, CreditBody, unknown>(req);
    const creditId = await service.registerCredit({ sessionId: params.sessionId, ...body });
    res.status(201).json({ success: true, data: { creditId } });
}

export async function updateCredit(req: Request, res: Response): Promise<void> {
    const { params, body } = validated<EntryParams, UpdateAmountBody, unknown>(req);
    await service.updateCredit({
        sessionId: params.sessionId,
        creditId: params.entryId,
        amountCents: body.amountCents,
    });
    res.json({ success: true });
}

export async function deleteCredit(req: Request, res: Response): Promise<void> {
    const { params } = validated<EntryParams, unknown, unknown>(req);
    await service.deleteCredit({ sessionId: params.sessionId, creditId: params.entryId });
    res.status(204).end();
}

export async function cashOut(req: Request, res: Response): Promise<void> {
    const { params, body } = validated<SessionParams, CashOutBody, unknown>(req);
    const payoutCents = await service.cashOut({ sessionId: params.sessionId, ...body });
    res.json({ success: true, data: { payoutCents } });
}

export async function undoCashOut(req: Request, res: Response): Promise<void> {
    const { params } = validated<PlayerParams, unknown, unknown>(req);
    await service.undoCashOut(params);
    res.status(204).end();
}
