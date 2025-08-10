import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as sessionService from '../services/sessionService';
import { SessionDetail, AddPlayerPayload, BuyInPayload, CreditPayload, CashOutPayload } from '../types';
import { usePreferences } from '../contexts/PreferencesContext';

export function useSession(sessionId: number) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const { t, formatCurrency } = usePreferences();
  const navigate = useNavigate();

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionService.getSession(sessionId);
      setSession(data);
    } catch (error: any) {
      toast.error(error?.message || t('failedLoadSession'));
    } finally {
      setLoading(false);
    }
  }, [sessionId, t]);

  const addPlayer = useCallback(async (payload: AddPlayerPayload) => {
    try {
      await sessionService.addPlayer(sessionId, payload);
      toast.success(t('playerAdded'));
      await loadSession();
    } catch (error: any) {
      toast.error(error?.message || t('failedAddPlayer'));
      throw error;
    }
  }, [sessionId, t, loadSession]);

  const registerBuyIn = useCallback(async (payload: BuyInPayload) => {
    try {
      await sessionService.registerBuyIn(sessionId, payload);
      toast.success(t('buyInRegistered'));
      await loadSession();
    } catch (error: any) {
      toast.error(error?.message || t('failedRegisterBuyIn'));
      throw error;
    }
  }, [sessionId, t, loadSession]);

  const registerCredit = useCallback(async (payload: CreditPayload) => {
    try {
      await sessionService.registerCredit(sessionId, payload);
      toast.success(t('creditRegistered'));
      await loadSession();
    } catch (error: any) {
      toast.error(error?.message || t('failedRegisterCredit'));
      throw error;
    }
  }, [sessionId, t, loadSession]);

  const cashOut = useCallback(async (payload: CashOutPayload) => {
    try {
      const result = await sessionService.cashOut(sessionId, payload);
      toast.success(`${t('cashOut')}: ${formatCurrency(result.payout)}`);
      await loadSession();
      return result;
    } catch (error: any) {
      toast.error(error?.message || t('failedCashOut'));
      throw error;
    }
  }, [sessionId, t, formatCurrency, loadSession]);

  const endSession = useCallback(async () => {
    if (!confirm(t('confirmEndSession'))) return;
    
    try {
      await sessionService.endSession(sessionId);
      toast.success(t('sessionEnded'));
      navigate('/');
    } catch (error: any) {
      toast.error(error?.message || t('failedEndSession'));
      throw error;
    }
  }, [sessionId, t, navigate]);

  return {
    session,
    loading,
    loadSession,
    addPlayer,
    registerBuyIn,
    registerCredit,
    cashOut,
    endSession,
  };
}
