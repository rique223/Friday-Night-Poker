import type {
    AddPlayerBody,
    BuyInBody,
    CashOutBody,
    CreateSessionBody,
    CreditBody,
    ListSessionsQuery,
    SessionDetail,
    SessionGroupPage,
    SessionStatus,
    SessionSummary,
} from '@fnp/shared';

import api from './apiClient';

/**
 * Thin transport over the API. Request and response shapes come from `@fnp/shared`, so
 * the hand-written client types that had already drifted from the server (Q75) are gone —
 * a rename on either side is now a compile error here.
 */

interface Envelope<T> {
    success: true;
    data: T;
}

export type ListSessionsParams = Partial<ListSessionsQuery>;

export async function listSessions(params: ListSessionsParams): Promise<SessionGroupPage> {
    const { data } = await api.get<Envelope<SessionGroupPage>>('/sessions', { params });
    return data.data;
}

export async function createSession(body: CreateSessionBody): Promise<number> {
    const { data } = await api.post<Envelope<{ sessionId: number }>>('/sessions', body);
    return data.data.sessionId;
}

export async function getSession(sessionId: number): Promise<SessionDetail> {
    const { data } = await api.get<Envelope<SessionDetail>>(`/sessions/${sessionId}`);
    return data.data;
}

export async function setSessionStatus(
    sessionId: number,
    status: SessionStatus,
): Promise<SessionSummary> {
    const { data } = await api.patch<Envelope<SessionSummary>>(`/sessions/${sessionId}`, {
        status,
    });
    return data.data;
}

export async function addPlayer(sessionId: number, body: AddPlayerBody): Promise<number> {
    const { data } = await api.post<Envelope<{ playerId: number }>>(
        `/sessions/${sessionId}/players`,
        body,
    );
    return data.data.playerId;
}

export async function removePlayer(sessionId: number, playerId: number): Promise<void> {
    await api.delete(`/sessions/${sessionId}/players/${playerId}`);
}

export async function registerBuyIn(sessionId: number, body: BuyInBody): Promise<string> {
    const { data } = await api.post<Envelope<{ entryId: string }>>(
        `/sessions/${sessionId}/buy-ins`,
        body,
    );
    return data.data.entryId;
}

export async function updateBuyIn(
    sessionId: number,
    entryId: string,
    amountCents: number,
): Promise<void> {
    await api.patch(`/sessions/${sessionId}/buy-ins/${entryId}`, { amountCents });
}

export async function deleteBuyIn(sessionId: number, entryId: string): Promise<void> {
    await api.delete(`/sessions/${sessionId}/buy-ins/${entryId}`);
}

export async function registerCredit(sessionId: number, body: CreditBody): Promise<string> {
    const { data } = await api.post<Envelope<{ creditId: string }>>(
        `/sessions/${sessionId}/credits`,
        body,
    );
    return data.data.creditId;
}

export async function updateCredit(
    sessionId: number,
    creditId: string,
    amountCents: number,
): Promise<void> {
    await api.patch(`/sessions/${sessionId}/credits/${creditId}`, { amountCents });
}

export async function deleteCredit(sessionId: number, creditId: string): Promise<void> {
    await api.delete(`/sessions/${sessionId}/credits/${creditId}`);
}

export async function cashOut(sessionId: number, body: CashOutBody): Promise<number> {
    const { data } = await api.post<Envelope<{ payoutCents: number }>>(
        `/sessions/${sessionId}/cash-outs`,
        body,
    );
    return data.data.payoutCents;
}

export async function undoCashOut(sessionId: number, playerId: number): Promise<void> {
    await api.delete(`/sessions/${sessionId}/cash-outs/${playerId}`);
}
