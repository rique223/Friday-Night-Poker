import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { usePreferences } from '../contexts/PreferencesContext';
import { Player } from '../types';
import HeaderActions from '../components/HeaderActions';
import AddPlayerForm from '../components/forms/AddPlayerForm';
import BuyInForm from '../components/forms/BuyInForm';
import CreditForm from '../components/forms/CreditForm';
import CashOutForm from '../components/forms/CashOutForm';
import PlayerCard from '../components/PlayerCard';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PlayerCardSkeleton from '../components/PlayerCardSkeleton';

export default function SessionDetailPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const { t } = usePreferences();

  const {
    session,
    loading,
    loadSession,
    addPlayer,
    registerBuyIn,
    registerCredit,
    cashOut,
    endSession,
  } = useSession(sessionId);

  const [buyInOpen, setBuyInOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [cashOutPlayer, setCashOutPlayer] = useState<Player | null>(null);
  const [playersTab, setPlayersTab] = useState<'active' | 'inactive'>('active');

  const lastInitialBuyIn = localStorage.getItem('lastInitialBuyIn') || '';
  const hasActivePlayers = useMemo(() => 
    (session?.players || []).some(p => p.isActive), 
    [session?.players]
  );

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleEndSession = async () => {
    if (hasActivePlayers) {
      toast(t('cashOutAllFirst'), { icon: '⚠️' });
      return;
    }
    await endSession();
  };

  const handleAddPlayer = async (payload: { name: string; initialBuyIn: number }) => {
    await addPlayer(payload);
  };

  const handleBuyIn = async (payload: { playerId: number; amount: number }) => {
    await registerBuyIn(payload);
    setBuyInOpen(false);
  };

  const handleCredit = async (payload: { providerId: number; receiverId: number; amount: number }) => {
    await registerCredit(payload);
    setCreditOpen(false);
  };

  const handleCashOut = async (payload: { playerId: number; finalChipCount: number }) => {
    await cashOut(payload);
    setCashOutPlayer(null);
  };

  if (!session && loading) {
    return (
      <div className='max-w-4xl mx-auto p-6 space-y-6'>
        <div className='space-y-2'>
          {[...Array(4)].map((_, i) => (
            <PlayerCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='text-center'>Session not found</div>
      </div>
    );
  }

  const activePlayers = session.players.filter(p => p.isActive);
  const inactivePlayers = session.players.filter(p => !p.isActive);
  const displayedPlayers = playersTab === 'active' ? activePlayers : inactivePlayers;

  return (
    <div className='max-w-4xl mx-auto p-6 space-y-6'>
      <header className='flex flex-row gap-2 sm:flex-row sm:items-center justify-between relative'>
        <div className='flex items-center gap-2'>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/')}
            className='inline-flex items-center gap-2'
          >
            <ArrowLeft size={16} /> {t('back')}
          </Button>
          <h1 className='text-lg sm:text-xl font-bold'>
            {t('session')} #{session.id}
          </h1>
        </div>

        <HeaderActions 
          extraMenuItems={
            <Button
              variant="danger"
              onClick={handleEndSession}
              title={hasActivePlayers ? t('cashOutAllFirst') : ''}
              className='w-full'
            >
              {t('endSession')}
            </Button>
          }
        />
      </header>

      <AddPlayerForm onSubmit={handleAddPlayer} defaultInitialBuyIn={lastInitialBuyIn} />

      <section className='card p-5 flex gap-3'>
        <Button
          disabled={!session.isActive}
          onClick={() => setBuyInOpen(true)}
          className='flex-1'
        >
          {t('registerBuyIn')}
        </Button>
        <Button
          variant="secondary"
          disabled={!session.isActive}
          onClick={() => setCreditOpen(true)}
          className='flex-1'
        >
          {t('registerCredit')}
        </Button>
      </section>

      <section className='card p-5'>
        <h2 className='font-semibold mb-3'>{t('players')}</h2>
        <div className='mb-3 flex items-center gap-2'>
          <Button
            variant={playersTab === 'active' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setPlayersTab('active')}
          >
            {t('active')} ({activePlayers.length})
          </Button>
          <Button
            variant={playersTab === 'inactive' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setPlayersTab('inactive')}
          >
            {t('inactive')} ({inactivePlayers.length})
          </Button>
        </div>
        <div className='grid gap-2'>
          {displayedPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onCashOut={setCashOutPlayer}
            />
          ))}
        </div>
      </section>

      {/* Modals */}
      <Modal
        title={t('registerBuyIn')}
        open={buyInOpen}
        onClose={() => setBuyInOpen(false)}
      >
        <BuyInForm onSubmit={handleBuyIn} players={session.players} />
      </Modal>

      <Modal
        title={t('registerCredit')}
        open={creditOpen}
        onClose={() => setCreditOpen(false)}
      >
        <CreditForm onSubmit={handleCredit} players={session.players} />
      </Modal>

      <Modal
        title={t('cashOut')}
        open={!!cashOutPlayer}
        onClose={() => setCashOutPlayer(null)}
      >
        {cashOutPlayer && (
          <CashOutForm onSubmit={handleCashOut} player={cashOutPlayer} />
        )}
      </Modal>

      {loading && (
        <div className='flex items-center justify-center p-4'>
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}