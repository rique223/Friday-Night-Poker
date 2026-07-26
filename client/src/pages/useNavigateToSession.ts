import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionSummary } from '@fnp/shared';

export function useNavigateToSession() {
    const navigate = useNavigate();
    return useCallback(
        (session: SessionSummary) => navigate(`/sessions/${session.id}`),
        [navigate],
    );
}
