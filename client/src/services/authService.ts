import { User, LoginPayload } from '../types/auth';
import { ApiResponse } from '../types';
import api from './apiClient';

export async function me(): Promise<User | null> {
  try {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    if (!data.success) throw new Error('Failed to get user');
    return data.data ?? null;
  } catch (e: any) {
    if (e?.response?.status === 401) return null;
    throw e;
  }
}

export async function login(payload: LoginPayload): Promise<User | null> {
  const { data } = await api.post<ApiResponse<User>>('/auth/login', payload);
  if (!data.success) throw new Error('Failed to login');
  return data.data ?? null;
}

export async function logout(): Promise<void> {
  const { data } = await api.post<ApiResponse<void>>('/auth/logout');
  if (!data.success) throw new Error('Failed to logout');
}
