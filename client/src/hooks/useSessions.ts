import type { SessionStatus } from '@fnp/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { usePreferences } from '../contexts/PreferencesContext';
import * as sessionService from '../services/sessionService';

import { type ListParams, sessionKeys } from './sessionKeys';
import { useToastMutation } from './useToastMutation';

export type { ListParams };

/** The viewer's offset from UTC, so the server groups by the day the players experienced. */
function tzOffsetMinutes(): number {
    return -new Date().getTimezoneOffset();
}

/**
 * Q70: replaces the hand-rolled `useState` + `useCallback` fetching, which had no cache,
 * no dedupe, no request cancellation (a fast tab switch could land an out-of-order
 * response) and no refetch on focus (Q95).
 *
 * Q68: `ArchivedSessionsPage` reimplemented all of this with `useState<any[]>` instead of
 * calling the hook — it now passes `status: 'archived'` here like every other caller.
 */
export function useSessionList(params: ListParams) {
    const { t } = usePreferences();
    const invalidateKey = sessionKeys.all;

    const query = useQuery({
        queryKey: sessionKeys.list(params),
        queryFn: () =>
            sessionService.listSessions({ ...params, tzOffsetMinutes: tzOffsetMinutes() }),
        // Keeps the current page on screen while the next one loads instead of flashing
        // an empty state between pages.
        placeholderData: keepPreviousData,
    });

    const createSession = useToastMutation({
        mutationFn: (createdBy: string) =>
            sessionService.createSession(createdBy.trim() ? { createdBy: createdBy.trim() } : {}),
        successMessage: () => t('sessionCreated'),
        errorKey: 'failedCreateSession',
        invalidateKey,
    });

    const archiveSession = useToastMutation({
        mutationFn: (id: number) => sessionService.setSessionStatus(id, 'archived'),
        successMessage: () => t('sessionArchived'),
        // Q57: this used to report `failedEndSession`; there was no archive key at all.
        errorKey: 'failedArchiveSession',
        invalidateKey,
    });

    const restoreSession = useToastMutation({
        mutationFn: (id: number) => sessionService.setSessionStatus(id, 'ended' as SessionStatus),
        successMessage: () => t('sessionRestored'),
        errorKey: 'failedRestoreSession',
        invalidateKey,
    });

    return {
        page: query.data,
        isLoading: query.isPending,
        isFetching: query.isFetching,
        error: query.error,
        createSession,
        archiveSession,
        restoreSession,
    };
}
