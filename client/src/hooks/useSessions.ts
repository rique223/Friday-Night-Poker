import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as sessionService from '../services/sessionService';
import { Session, CreateSessionPayload, PaginatedResponse } from '../types';
import { usePreferences } from '../contexts/PreferencesContext';

interface UseSessionsParams {
  archived?: boolean;
}

export function useSessions({ archived = false }: UseSessionsParams = {}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { t } = usePreferences();

  const loadSessions = useCallback(async (
    pageNumber = 1, 
    pageSize = 10, 
    query = ''
  ) => {
    setLoading(true);
    try {
      const loadFn = archived ? sessionService.listArchived : sessionService.listSessions;
      const result: PaginatedResponse<Session> = await loadFn({ 
        page: pageNumber, 
        pageSize, 
        q: query 
      });
      
      setSessions(result.items);
      setPage(pageNumber);
      setTotal(result.total);
    } catch (error: any) {
      const errorMessage = archived ? t('failedLoadArchived') : t('failedLoadSessions');
      toast.error(error?.message || errorMessage);
    } finally {
      setLoading(false);
    }
  }, [archived, t]);

  const createSession = useCallback(async (payload: CreateSessionPayload) => {
    try {
      await sessionService.createSession(payload);
      toast.success(t('sessionCreated'));
      await loadSessions(1, 10, '');
    } catch (error: any) {
      toast.error(error?.message || t('failedCreateSession'));
      throw error;
    }
  }, [t, loadSessions]);

  const archiveSession = useCallback(async (sessionId: number) => {
    try {
      await sessionService.archiveSession(sessionId);
      await loadSessions(page, 10, '');
    } catch (error: any) {
      toast.error(error?.message || t('failedEndSession'));
      throw error;
    }
  }, [page, t, loadSessions]);

  return {
    sessions,
    loading,
    page,
    total,
    loadSessions,
    createSession,
    archiveSession,
  };
}
