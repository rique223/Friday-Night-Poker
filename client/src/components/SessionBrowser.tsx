import type { FormEvent } from 'react';
import type { SessionGroup, SessionSummary } from '@fnp/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ArchiveRestore, Trash2 } from 'lucide-react';

import { usePreferences } from '../contexts/PreferencesContext';
import { GROUP_BY_OPTIONS, type GroupBy } from '../i18n/types';

import OverflowMenu from './OverflowMenu';
import SessionListSkeleton from './SessionListSkeleton';
import { Button, Input, Select } from './ui';

interface SessionBrowserProps {
    groups: SessionGroup[];
    groupBy: GroupBy;
    onGroupByChange: (groupBy: GroupBy) => void;
    query: string;
    onQueryChange: (query: string) => void;
    onSubmitFilter: () => void;
    page: number;
    totalGroups: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onSelect: (session: SessionSummary) => void;
    /** Omitted on the archive page, where archiving makes no sense. */
    onArchive?: (session: SessionSummary) => void;
    /** Only supplied on the archive page (Q11 — the archive is no longer one-way). */
    onRestore?: (session: SessionSummary) => void;
    isLoading: boolean;
    isMutating?: boolean;
    emptyTitle: string;
    emptyHint: string;
}

export default function SessionBrowser({
    groups,
    groupBy,
    onGroupByChange,
    query,
    onQueryChange,
    onSubmitFilter,
    page,
    totalGroups,
    pageSize,
    onPageChange,
    onSelect,
    onArchive,
    onRestore,
    isLoading,
    isMutating = false,
    emptyTitle,
    emptyHint,
}: SessionBrowserProps) {
    const { t, formatDateTime, formatGroupLabel } = usePreferences();

    const totalPages = Math.max(1, Math.ceil(totalGroups / Math.max(1, pageSize)));
    const isFiltered = query.trim().length > 0;

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        onSubmitFilter();
    }

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 w-full">
                    <Input
                        id="session-filter"
                        value={query}
                        onChange={event => onQueryChange(event.target.value)}
                        placeholder={t('filterCreator')}
                        className="flex-1"
                        aria-label={t('filterCreator')}
                    />
                    <Select
                        id="group-by"
                        value={groupBy}
                        onChange={event => onGroupByChange(event.target.value as GroupBy)}
                        options={GROUP_BY_OPTIONS.map(value => ({ value, label: t(value) }))}
                        className="flex-1"
                        aria-label={t('groupBy')}
                    />
                </div>
                <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                        {t('filter')}
                    </Button>
                    {isFiltered && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                onQueryChange('');
                                onSubmitFilter();
                            }}
                        >
                            {t('clearFilter')}
                        </Button>
                    )}
                </div>
            </form>

            {isLoading ? (
                <SessionListSkeleton />
            ) : groups.length === 0 ? (
                <div className="grid place-items-center min-h-[180px]">
                    <div className="text-center space-y-1">
                        <div className="text-base">{isFiltered ? t('noResults') : emptyTitle}</div>
                        <div className="text-sm text-dim">
                            {isFiltered ? t('noResultsHint') : emptyHint}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="text-xs text-dim">{t('orderedNewest')}</div>
                    <div className="space-y-3">
                        <AnimatePresence initial={false}>
                            {groups.map(group => (
                                <motion.div
                                    key={group.key}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="card session-group"
                                >
                                    <div className="px-4 py-2 border-b border-border text-sm font-semibold">
                                        {formatGroupLabel(group.startDate, groupBy)}
                                    </div>
                                    <ul className="divide-y divide-border">
                                        {group.sessions.map(session => (
                                            <li
                                                key={session.id}
                                                className="session-item flex items-center gap-2 pr-2"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => onSelect(session)}
                                                    className="flex-1 text-left px-4 py-2 text-sm hover:bg-white/5 rounded-none"
                                                >
                                                    <span className="font-medium block">
                                                        {t('session')} #{session.id}
                                                    </span>
                                                    <span className="text-dim">
                                                        {formatDateTime(session.createdAt)}
                                                        {session.createdBy
                                                            ? ` · ${session.createdBy}`
                                                            : ''}
                                                    </span>
                                                </button>

                                                {session.status !== 'open' && (
                                                    <span className="px-2 py-0.5 text-xs rounded bg-danger/20 text-danger whitespace-nowrap">
                                                        {t(
                                                            session.status === 'archived'
                                                                ? 'archived'
                                                                : 'ended',
                                                        )}
                                                    </span>
                                                )}

                                                {(onArchive ?? onRestore) && (
                                                    <OverflowMenu
                                                        ariaLabel={t('sessionActions')}
                                                        buttonClassName="px-2 py-1 text-sm"
                                                        panelClassName="absolute right-0 mt-2 w-52 card shadow-lg z-20 p-2 space-y-1"
                                                    >
                                                        {onArchive && (
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                className="w-full inline-flex gap-2"
                                                                disabled={isMutating}
                                                                onClick={() => onArchive(session)}
                                                            >
                                                                <Trash2 size={14} />
                                                                {t('deleteArchive')}
                                                            </Button>
                                                        )}
                                                        {onRestore && (
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="w-full inline-flex gap-2"
                                                                disabled={isMutating}
                                                                onClick={() => onRestore(session)}
                                                            >
                                                                <ArchiveRestore size={14} />
                                                                {t('restore')}
                                                            </Button>
                                                        )}
                                                    </OverflowMenu>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-2 justify-between">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                        >
                            {t('prev')}
                        </Button>
                        <span className="text-sm text-dim">
                            {t('page')} {page} {t('of')} {totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => onPageChange(page + 1)}
                        >
                            {t('next')}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
