import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionSummary } from '@fnp/shared';

/** Shared by the session list and the archive so both open a session the same way. */
export function useNavigateToSession() {
    const navigate = useNavigate();
    return useCallback(
        (session: SessionSummary) => navigate(`/sessions/${session.id}`),
        [navigate],
    );
}
