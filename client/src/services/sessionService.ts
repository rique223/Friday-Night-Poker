import api from './apiClient';
import { 
  Session, 
  SessionDetail, 
  PaginatedResponse,
  CreateSessionPayload,
  AddPlayerPayload,
  BuyInPayload,
  CreditPayload,
  CashOutPayload,
  ApiResponse
} from '../types';

interface ListSessionsParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export async function listSessions(params: ListSessionsParams = {}): Promise<PaginatedResponse<Session>> {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Session>>>('/sessions', { params });
  if (!data.success) throw new Error(data.error || 'Failed to list sessions');
  return data.data!;
}

export async function listArchived(params: ListSessionsParams = {}): Promise<PaginatedResponse<Session>> {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Session>>>('/sessions/archived', { params });
  if (!data.success) throw new Error(data.error || 'Failed to list archived sessions');
  return data.data!;
}

export async function createSession(payload: CreateSessionPayload): Promise<{ sessionId: number }> {
  const { data } = await api.post<ApiResponse<{ sessionId: number }>>('/sessions', payload);
  if (!data.success) throw new Error(data.error || 'Failed to create session');
  return data.data!;
}

export async function getSession(sessionId: number): Promise<SessionDetail> {
  const { data } = await api.get<ApiResponse<SessionDetail>>(`/sessions/${sessionId}`);
  if (!data.success) throw new Error(data.error || 'Failed to get session');
  return data.data!;
}

export async function endSession(sessionId: number): Promise<{ isActive: boolean }> {
  const { data } = await api.post<ApiResponse<{ isActive: boolean }>>(`/sessions/${sessionId}/end`);
  if (!data.success) throw new Error(data.error || 'Failed to end session');
  return data.data!;
}

export async function archiveSession(sessionId: number): Promise<void> {
  const { data } = await api.post<ApiResponse<void>>(`/sessions/${sessionId}/archive`);
  if (!data.success) throw new Error(data.error || 'Failed to archive session');
}

export async function addPlayer(sessionId: number, payload: AddPlayerPayload): Promise<{ playerId: number }> {
  const { data } = await api.post<ApiResponse<{ playerId: number }>>(`/sessions/${sessionId}/players`, payload);
  if (!data.success) throw new Error(data.error || 'Failed to add player');
  return data.data!;
}

export async function registerBuyIn(sessionId: number, payload: BuyInPayload): Promise<void> {
  const { data } = await api.post<ApiResponse<void>>(`/sessions/${sessionId}/buy-in`, payload);
  if (!data.success) throw new Error(data.error || 'Failed to register buy-in');
}

export async function registerCredit(sessionId: number, payload: CreditPayload): Promise<void> {
  const { data } = await api.post<ApiResponse<void>>(`/sessions/${sessionId}/credit`, payload);
  if (!data.success) throw new Error(data.error || 'Failed to register credit');
}

export async function cashOut(sessionId: number, payload: CashOutPayload): Promise<{ payout: number }> {
  const { data } = await api.post<ApiResponse<{ payout: number }>>(`/sessions/${sessionId}/cash-out`, payload);
  if (!data.success) throw new Error(data.error || 'Failed to cash out');
  return data.data!;
}
