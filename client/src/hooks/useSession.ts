import type { SessionStatus } from '@fnp/shared';
import { useQuery } from '@tanstack/react-query';

import { SESSION_STALE_TIME_MS } from '../constants';
import { usePreferences } from '../contexts/PreferencesContext';
import * as sessionService from '../services/sessionService';

import { sessionKeys } from './sessionKeys';
import { useToastMutation } from './useToastMutation';

/**
 * The session detail query plus every mutation that can act on it.
 *
 * Each mutation invalidates the session cache once rather than `await loadSession()`
 * inline (Q70/Q89); React Query dedupes overlapping invalidations, so a burst of buy-ins
 * produces one refetch instead of one per call, and a stale response from a cancelled
 * request can no longer overwrite fresher data.
 */
export function useSession(sessionId: number) {
    const { t, formatCurrency } = usePreferences();
    const invalidateKey = sessionKeys.all;

    const query = useQuery({
        queryKey: sessionKeys.detail(sessionId),
        queryFn: () => sessionService.getSession(sessionId),
        enabled: Number.isFinite(sessionId) && sessionId > 0,
        staleTime: SESSION_STALE_TIME_MS,
    });

    const addPlayer = useToastMutation({
        mutationFn: (body: { name: string; initialBuyInCents: number }) =>
            sessionService.addPlayer(sessionId, body),
        successMessage: () => t('playerAdded'),
        errorKey: 'failedAddPlayer',
        invalidateKey,
    });

    const removePlayer = useToastMutation({
        mutationFn: (playerId: number) => sessionService.removePlayer(sessionId, playerId),
        successMessage: () => t('playerRemoved'),
        errorKey: 'failedRemovePlayer',
        invalidateKey,
    });

    const registerBuyIn = useToastMutation({
        mutationFn: (body: { playerId: number; amountCents: number }) =>
            sessionService.registerBuyIn(sessionId, body),
        successMessage: () => t('buyInRegistered'),
        errorKey: 'failedRegisterBuyIn',
        invalidateKey,
    });

    const updateBuyIn = useToastMutation({
        mutationFn: ({ entryId, amountCents }: { entryId: string; amountCents: number }) =>
            sessionService.updateBuyIn(sessionId, entryId, amountCents),
        successMessage: () => t('buyInUpdated'),
        errorKey: 'failedUpdateBuyIn',
        invalidateKey,
    });

    const deleteBuyIn = useToastMutation({
        mutationFn: (entryId: string) => sessionService.deleteBuyIn(sessionId, entryId),
        successMessage: () => t('buyInDeleted'),
        errorKey: 'failedDeleteBuyIn',
        invalidateKey,
    });

    const registerCredit = useToastMutation({
        mutationFn: (body: { providerId: number; receiverId: number; amountCents: number }) =>
            sessionService.registerCredit(sessionId, body),
        successMessage: () => t('creditRegistered'),
        errorKey: 'failedRegisterCredit',
        invalidateKey,
    });

    const updateCredit = useToastMutation({
        mutationFn: ({ creditId, amountCents }: { creditId: string; amountCents: number }) =>
            sessionService.updateCredit(sessionId, creditId, amountCents),
        successMessage: () => t('creditUpdated'),
        errorKey: 'failedUpdateCredit',
        invalidateKey,
    });

    const deleteCredit = useToastMutation({
        mutationFn: (creditId: string) => sessionService.deleteCredit(sessionId, creditId),
        successMessage: () => t('creditDeleted'),
        errorKey: 'failedDeleteCredit',
        invalidateKey,
    });

    const cashOut = useToastMutation({
        mutationFn: (body: { playerId: number; finalChipCountCents: number }) =>
            sessionService.cashOut(sessionId, body),
        successMessage: payoutCents => `${t('payout')}: ${formatCurrency(payoutCents)}`,
        errorKey: 'failedCashOut',
        invalidateKey,
    });

    const undoCashOut = useToastMutation({
        mutationFn: (playerId: number) => sessionService.undoCashOut(sessionId, playerId),
        successMessage: () => t('cashOutUndone'),
        errorKey: 'failedUndoCashOut',
        invalidateKey,
    });

    const endSession = useToastMutation({
        mutationFn: () => sessionService.setSessionStatus(sessionId, 'ended' as SessionStatus),
        successMessage: () => t('sessionEnded'),
        errorKey: 'failedEndSession',
        invalidateKey,
    });

    return {
        session: query.data,
        // Q59: `loading` used to start `false`, so the first paint rendered an empty state
        // before the fetch had even been issued.
        isLoading: query.isPending,
        isFetching: query.isFetching,
        error: query.error,
        addPlayer,
        removePlayer,
        registerBuyIn,
        updateBuyIn,
        deleteBuyIn,
        registerCredit,
        updateCredit,
        deleteCredit,
        cashOut,
        undoCashOut,
        endSession,
    };
}
