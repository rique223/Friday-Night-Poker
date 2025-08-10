import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import KebabMenu from './KebabMenu';
import Select from './ui/Select';
import Input from './ui/Input';
import Button from './ui/Button';
import { archiveSession } from '../services/sessionService';
import { usePreferences } from '../contexts/PreferencesContext';
import { Session, GroupBy } from '../types';

interface SessionBrowserProps {
  sessions: Session[];
  onPage?: (page: number) => void;
  onFilter?: (q: string) => void;
  onSelect?: (s: Session) => void;
  page: number;
  pageSize: number;
  total: number;
  showControls?: boolean;
}

export default function SessionBrowser({ 
  sessions = [], 
  onPage, 
  onFilter, 
  onSelect, 
  page, 
  pageSize, 
  total, 
  showControls = true 
}: SessionBrowserProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('week');
  const [q, setQ] = useState('');
  const { t } = usePreferences();

	const grouped = useMemo(() => {
		const groups = new Map<string, typeof sessions>();
		const makeKey = (iso: string) => {
			const d = new Date(iso);
			if (groupBy === 'year') return `${d.getFullYear()}`;
			if (groupBy === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
			const dayNum = tmp.getUTCDay() || 7;
			tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
			const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
			const weekNo = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
			return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
		};
		const sorted = [...sessions].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
		for (const s of sorted) {
			const key = makeKey(s.createdAt);
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(s);
		}
		return Array.from(groups.entries());
	}, [sessions, groupBy]);

	const totalPages = Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize || 10)));
	const canPrev = page > 1;
	const canNext = page < totalPages;

	function go(nextPage: number) {
		onPage?.(nextPage);
	}

	function applyFilter(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		onFilter?.(q);
	}

  const groupByOptions = [
    { value: 'week', label: t('week') },
    { value: 'month', label: t('month') },
    { value: 'year', label: t('year') },
  ];

  return (
    <div className='space-y-4'>
      {showControls && (
        <div className='flex items-center gap-3'>
          <form onSubmit={applyFilter} className='flex flex-col items-center gap-2 flex-1'>
            <div className='flex flex-row gap-2 w-full'>
              <Input
                id='q'
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('filterCreator')}
                className='flex-1'
                aria-label={t('filter')}
              />
              <Select
                id='groupBy'
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                options={groupByOptions}
                className='flex-1'
                aria-label={t('groupBy')}
              />
            </div>
            <Button type="submit" className='w-full flex-1' size="md">
              {t('filter')}
            </Button>
          </form>
        </div>
      )}
			{showControls && <div className='text-xs text-[var(--text-dim)]'>{t('orderedNewest')}</div>}
			<div className='space-y-3'>
				<AnimatePresence>
					{grouped.map(([label, items]) => (
						<motion.div
							key={label}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							className='card session-group'
						>
							<div className='px-4 py-2 border-b border-white/10 text-sm font-semibold' style={{ color: 'var(--text)' }}>
								{label}
							</div>
							<ul className='divide-y divide-white/5'>
								{items.map((s) => (
									<motion.li
										key={s.id}
										initial={{ opacity: 0, y: 6 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.15 }}
										onClick={() => onSelect?.(s)}
										className='session-item px-4 py-2 text-sm flex justify-between items-center hover:bg-white/5 cursor-pointer'
									>
										<div className='text-left'>
											<div className='font-medium' style={{ color: 'var(--text)' }}>
												{t('session')} #{s.id}
											</div>
											<div className='text-[var(--text-dim)]'>
												{new Date(s.createdAt).toLocaleString()} {s.createdBy ? `· ${s.createdBy}` : ''}
											</div>
										</div>
										<div className='flex items-center gap-2'>
											{!s.isActive && (
												<span className='px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400'>{t('ended')}</span>
											)}
											<KebabMenu
												onArchive={async () => {
													try {
														await archiveSession(s.id);
														onPage?.(page);
													} catch (e: any) {
														toast.error(e?.message || t('failedEndSession'));
													}
												}}
											/>
										</div>
									</motion.li>
								))}
							</ul>
						</motion.div>
					))}
				</AnimatePresence>
			</div>
      {showControls && (
        <div className='flex items-center gap-2 justify-end'>
          <Button
            variant="secondary"
            size="sm"
            disabled={!canPrev}
            onClick={() => go(Math.max(1, page - 1))}
          >
            {t('prev')}
          </Button>
          <div className='text-sm text-[var(--text-dim)]'>
            {t('page')} {page} {totalPages > 1 ? `${t('of')} ${totalPages}` : ''}
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!canNext}
            onClick={() => go(page + 1)}
          >
            {t('next')}
          </Button>
        </div>
      )}
		</div>
	);
}
