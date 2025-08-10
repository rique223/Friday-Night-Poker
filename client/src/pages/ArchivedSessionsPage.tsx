import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listArchived } from '../services/sessionService';
import SessionBrowser from '../components/SessionBrowser';
import ThemeToggle from '../components/ThemeToggle';
import LangCurrencySwitcher from '../components/LangCurrencySwitcher';
import { usePreferences } from '../contexts/PreferencesContext';
import { AnimatePresence, motion } from 'framer-motion';

export default function ArchivedSessionsPage() {
	const { t } = usePreferences();
	const [sessions, setSessions] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const navigate = useNavigate();
	const hasSessions = sessions.length > 0;
	const menuRef = useRef<HTMLDivElement>(null);
	const [menuOpen, setMenuOpen] = useState(false);

	async function refresh(p = 1) {
		setLoading(true);
		try {
			const res = await listArchived({ page: p, pageSize: 10 });
			setSessions(res.items);
			setPage(p);
			setTotal(res.total || 0);
		} catch (e: any) {
			toast.error(e?.message || t('failedLoadArchived'));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		refresh(1);
	}, []);

	return (
		<div className='max-w-4xl mx-auto p-6 space-y-6'>
			<header className='flex items-center justify-between'>
				<div className='flex items-center gap-2'>
					<button className='btn btn-secondary px-3 py-2' onClick={() => navigate('/')}>
						← {t('back')}
					</button>
				</div>

				{/* Mobile actions */}
				<div className='flex items-center gap-2 sm:hidden'>
					<ThemeToggle />
					<div className='relative' ref={menuRef}>
						<button aria-label={t('menu')} className='btn btn-secondary px-3 py-2' onClick={() => setMenuOpen((v) => !v)}>
							⋮
						</button>
						<AnimatePresence>
							{menuOpen && (
								<>
									<motion.div
										initial={{ opacity: 0, y: 4, scale: 0.98 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: 4, scale: 0.98 }}
										className='absolute right-0 mt-2 w-60 card shadow-lg z-20 p-3 space-y-2'
									>
										<LangCurrencySwitcher />
									</motion.div>
									<div className='fixed inset-0 z-10' onClick={() => setMenuOpen(false)} />
								</>
							)}
						</AnimatePresence>
					</div>
				</div>

				{/* Desktop actions */}
				<div className='hidden sm:flex items-center gap-2'>
					<LangCurrencySwitcher />
					<ThemeToggle />
				</div>
			</header>

			<section className='card p-5 space-y-4'>
				<h1 className='text-2xl font-semibold tracking-tight'>{t('archivedSessions')}</h1>

				{!loading && !hasSessions && (
					<div className='grid place-items-center min-h-[180px]'>
						<div className='text-center space-y-1'>
							<div className='text-base' style={{ color: 'var(--text)' }}>
								{t('noArchivedSessions')}
							</div>
							<div className='text-sm text-[var(--text-dim)]'>{t('noArchivedSessionsHint')}</div>
						</div>
					</div>
				)}

				<SessionBrowser
					sessions={sessions}
					onPage={(p) => refresh(p)}
					onSelect={(s) => navigate(`/sessions/${s.id}`)}
					page={page}
					pageSize={10}
					total={total}
					showControls={hasSessions}
				/>
			</section>
		</div>
	);
}
