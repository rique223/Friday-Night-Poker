import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useSessions } from '../hooks/useSessions';
import { useForm } from '../hooks/useForm';
import { usePreferences } from '../contexts/PreferencesContext';
import { CreateSessionPayload, Session } from '../types';
import HeaderActions from '../components/HeaderActions';
import SessionBrowser from '../components/SessionBrowser';
import SessionListSkeleton from '../components/SessionListSkeleton';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function SessionListPage() {
  const { t } = usePreferences();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');

  const {
    sessions,
    loading,
    page,
    total,
    loadSessions,
    createSession,
    archiveSession,
  } = useSessions();

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [availableHeight, setAvailableHeight] = useState<number>(0);

  const hasSessions = sessions && sessions.length > 0;
  const isCentered = !hasSessions;

  const {
    values,
    isSubmitting,
    handleSubmit,
    getFieldProps,
  } = useForm<CreateSessionPayload>({
    initialValues: {
      createdBy: '',
    },
    onSubmit: async (data) => {
      await createSession(data);
    },
  });

  useEffect(() => {
    function updateAvailableHeight() {
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const paddingY = 48; // p-6 top+bottom
      setAvailableHeight(Math.max(0, window.innerHeight - headerHeight - paddingY));
    }
    updateAvailableHeight();
    window.addEventListener('resize', updateAvailableHeight);
    return () => window.removeEventListener('resize', updateAvailableHeight);
  }, []);

  useEffect(() => {
    loadSessions(1, 10, '');
  }, [loadSessions]);

  const handlePageChange = (newPage: number) => {
    loadSessions(newPage, 10, filter);
  };

  const handleFilter = (query: string) => {
    setFilter(query);
    loadSessions(1, 10, query);
  };

  const handleSelectSession = (session: Session) => {
    navigate(`/sessions/${session.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className='max-w-4xl mx-auto min-h-screen flex flex-col p-6'
    >
      <header ref={headerRef} className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <div className='w-full flex items-center justify-between gap-2'>
          <h1 className='text-xl sm:text-2xl font-semibold tracking-tight truncate'>
            Friday Night Poker
          </h1>
          <HeaderActions showLogout />
        </div>
      </header>

      <main className={`flex-1 ${isCentered ? '' : 'mt-6'}`}>
        {isCentered ? (
          <div className='grid place-items-center' style={{ minHeight: `${availableHeight}px` }}>
            <motion.section
              layout
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
              className='card p-5 space-y-4 w-full'
            >
              <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
                <Input
                  id='createdBy'
                  placeholder={t('yourName')}
                  className='w-full'
                  {...getFieldProps('createdBy')}
                />
                <Button
                  type="submit"
                  loading={isSubmitting}
                  className='w-full inline-flex items-center gap-2'
                >
                  <Plus size={16} /> {t('createSession')}
                </Button>
              </form>
            </motion.section>
          </div>
        ) : (
          <div className='space-y-6'>
            <motion.section
              layout
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
              className='card p-5 space-y-4'
            >
              <form onSubmit={handleSubmit} className='flex gap-3 flex-col sm:flex-row'>
                <Input
                  id='createdBy'
                  placeholder={t('yourName')}
                  className='flex-1'
                  {...getFieldProps('createdBy')}
                />
                <Button
                  type="submit"
                  loading={isSubmitting}
                  className='inline-flex items-center gap-2'
                >
                  <Plus size={16} /> {t('createSession')}
                </Button>
              </form>
            </motion.section>

            <motion.section
              layout
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
              className='card p-5 space-y-4'
            >
              {loading ? (
                <SessionListSkeleton />
              ) : (
                <SessionBrowser
                  sessions={sessions}
                  onPage={handlePageChange}
                  onFilter={handleFilter}
                  onSelect={handleSelectSession}
                  page={page}
                  pageSize={10}
                  total={total}
                  showControls={!loading && hasSessions}
                />
              )}
            </motion.section>
          </div>
        )}
      </main>
    </motion.div>
  );
}