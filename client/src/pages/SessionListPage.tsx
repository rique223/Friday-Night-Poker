import { useState } from 'react';
import type { SessionSummary } from '@fnp/shared';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

import ConfirmDialog from '../components/ConfirmDialog';
import HeaderActions from '../components/HeaderActions';
import SessionBrowser from '../components/SessionBrowser';
import { Button, Input } from '../components/ui';
import { PAGE_SIZE } from '../constants';
import { usePreferences } from '../contexts/PreferencesContext';
import { useForm } from '../hooks/useForm';
import { useSessionList } from '../hooks/useSessions';
import type { GroupBy } from '../i18n/types';

import { useNavigateToSession } from './useNavigateToSession';

interface Values extends Record<string, unknown> {
    createdBy: string;
}

export default function SessionListPage() {
    const { t } = usePreferences();
    const goToSession = useNavigateToSession();

    const [page, setPage] = useState(1);
    const [groupBy, setGroupBy] = useState<GroupBy>('week');
    const [queryInput, setQueryInput] = useState('');
    const [appliedQuery, setAppliedQuery] = useState('');
    const [pendingArchive, setPendingArchive] = useState<SessionSummary | null>(null);

    const {
        page: result,
        isLoading,
        createSession,
        archiveSession,
    } = useSessionList({
        status: 'all',
        page,
        pageSize: PAGE_SIZE,
        q: appliedQuery,
        groupBy,
    });

    const { isSubmitting, handleSubmit, getFieldProps, reset } = useForm<Values>({
        initialValues: { createdBy: '' },
        onSubmit: async values => {
            await createSession.mutateAsync(values.createdBy);
            reset();
            setPage(1);
        },
    });

    function applyFilter() {
        setAppliedQuery(queryInput);
        setPage(1);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto min-h-screen flex flex-col p-6"
        >
            <header className="flex items-center justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
                    Friday Night Poker
                </h1>
                <HeaderActions showLogout />
            </header>

            <main className="flex-1 mt-6 space-y-6">
                <section className="card p-5">
                    <form onSubmit={handleSubmit} className="flex gap-3 flex-col sm:flex-row">
                        <Input
                            id="createdBy"
                            placeholder={t('yourName')}
                            className="flex-1"
                            aria-label={t('yourName')}
                            {...getFieldProps('createdBy')}
                        />
                        <Button
                            type="submit"
                            loading={isSubmitting}
                            className="inline-flex items-center gap-2"
                        >
                            <Plus size={16} /> {t('createSession')}
                        </Button>
                    </form>
                </section>

                <section className="card p-5">
                    <SessionBrowser
                        groups={result?.groups ?? []}
                        groupBy={groupBy}
                        onGroupByChange={value => {
                            setGroupBy(value);
                            setPage(1);
                        }}
                        query={queryInput}
                        onQueryChange={setQueryInput}
                        onSubmitFilter={applyFilter}
                        page={result?.page ?? page}
                        pageSize={result?.pageSize ?? PAGE_SIZE}
                        totalGroups={result?.totalGroups ?? 0}
                        onPageChange={setPage}
                        onSelect={goToSession}
                        onArchive={setPendingArchive}
                        isLoading={isLoading}
                        isMutating={archiveSession.isPending}
                        emptyTitle={t('noSessionsYet')}
                        emptyHint={t('noSessionsYetHint')}
                    />
                </section>
            </main>

            <ConfirmDialog
                open={pendingArchive !== null}
                title={t('confirmArchiveTitle')}
                body={t('confirmArchiveBody')}
                confirmLabel={t('deleteArchive')}
                destructive
                busy={archiveSession.isPending}
                onCancel={() => setPendingArchive(null)}
                onConfirm={() => {
                    if (!pendingArchive) return;
                    archiveSession.mutate(pendingArchive.id, {
                        onSettled: () => setPendingArchive(null),
                    });
                }}
            />
        </motion.div>
    );
}
