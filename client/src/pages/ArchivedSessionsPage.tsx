import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionSummary } from '@fnp/shared';
import { ArrowLeft } from 'lucide-react';

import ConfirmDialog from '../components/ConfirmDialog';
import HeaderActions from '../components/HeaderActions';
import SessionBrowser from '../components/SessionBrowser';
import { Button } from '../components/ui';
import { PAGE_SIZE } from '../constants';
import { usePreferences } from '../contexts/PreferencesContext';
import { useSessionList } from '../hooks/useSessions';
import type { GroupBy } from '../i18n/types';

import { useNavigateToSession } from './useNavigateToSession';

/**
 * Q68: this page used to reimplement `useSessions` from scratch — duplicated fetch,
 * loading, page and total state typed as `useState<any[]>`, its own `refresh()` with a
 * missing effect dependency, and a hand-rolled mobile overflow menu duplicating
 * `HeaderActions` (including a `menuRef` that was assigned but never used).
 *
 * Q58: it also rendered `SessionBrowser` without `onFilter`, so typing a name and pressing
 * "Filtrar" did nothing, ever — and pagination dropped the query. Both come free now that
 * the shared hook and component drive the page.
 */
export default function ArchivedSessionsPage() {
    const { t } = usePreferences();
    const navigate = useNavigate();
    const goToSession = useNavigateToSession();

    const [page, setPage] = useState(1);
    const [groupBy, setGroupBy] = useState<GroupBy>('week');
    const [queryInput, setQueryInput] = useState('');
    const [appliedQuery, setAppliedQuery] = useState('');
    const [pendingRestore, setPendingRestore] = useState<SessionSummary | null>(null);

    const {
        page: result,
        isLoading,
        restoreSession,
    } = useSessionList({
        status: 'archived',
        page,
        pageSize: PAGE_SIZE,
        q: appliedQuery,
        groupBy,
    });

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <header className="flex items-center justify-between gap-2">
                <Button
                    variant="secondary"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> {t('back')}
                </Button>
                <HeaderActions showArchived={false} showLogout />
            </header>

            <section className="card p-5 space-y-4">
                <h1 className="text-2xl font-semibold tracking-tight">{t('archivedSessions')}</h1>

                <SessionBrowser
                    groups={result?.groups ?? []}
                    groupBy={groupBy}
                    onGroupByChange={value => {
                        setGroupBy(value);
                        setPage(1);
                    }}
                    query={queryInput}
                    onQueryChange={setQueryInput}
                    onSubmitFilter={() => {
                        setAppliedQuery(queryInput);
                        setPage(1);
                    }}
                    page={result?.page ?? page}
                    pageSize={result?.pageSize ?? PAGE_SIZE}
                    totalGroups={result?.totalGroups ?? 0}
                    onPageChange={setPage}
                    onSelect={goToSession}
                    onRestore={setPendingRestore}
                    isLoading={isLoading}
                    isMutating={restoreSession.isPending}
                    emptyTitle={t('noArchivedSessions')}
                    emptyHint={t('noArchivedSessionsHint')}
                />
            </section>

            {/* Q11: there was no unarchive endpoint or UI at all — archiving was one-way. */}
            <ConfirmDialog
                open={pendingRestore !== null}
                title={t('confirmRestoreTitle')}
                body={t('confirmRestoreBody')}
                confirmLabel={t('restore')}
                busy={restoreSession.isPending}
                onCancel={() => setPendingRestore(null)}
                onConfirm={() => {
                    if (!pendingRestore) return;
                    restoreSession.mutate(pendingRestore.id, {
                        onSettled: () => setPendingRestore(null),
                    });
                }}
            />
        </div>
    );
}
