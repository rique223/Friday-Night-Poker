import { memo } from 'react';
import { Player } from '../types';
import { usePreferences } from '../contexts/PreferencesContext';
import NumberTicker from './NumberTicker';
import Button from './ui/Button';

interface PlayerCardProps {
  player: Player;
  onCashOut?: (player: Player) => void;
}

const PlayerCard = memo(function PlayerCard({ player, onCashOut }: PlayerCardProps) {
  const { t, formatCurrency } = usePreferences();

  return (
    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 card p-3'>
      <div className='flex-1'>
        <div className='font-semibold'>
          {player.name} {!player.isActive && (
            <span className='text-sm text-[var(--text-dim)]'>
              ({t('inactive').toLowerCase()})
            </span>
          )}
        </div>
        <div className='text-sm text-[var(--text-dim)]'>
          {t('totalBuyIns')}: <NumberTicker value={player.totalBuyIns || 0} formatter={formatCurrency} />
          {' · '}
          {t('credits')}: <NumberTicker value={player.totalCredits || 0} formatter={formatCurrency} />
        </div>
        <div className='text-xs text-[var(--text-dim)]'>
          {t('netBalance')}: <NumberTicker value={player.netBalance} formatter={formatCurrency} />
        </div>
        {!player.isActive && player.payout != null && (
          <div className='text-xs'>
            {t('finalChips')}: {player.finalChipCount} · {t('payout')}:{' '}
            <NumberTicker value={player.payout} formatter={formatCurrency} />
          </div>
        )}
      </div>
      {player.isActive && onCashOut && (
        <Button onClick={() => onCashOut(player)} size="sm">
          {t('cashOut')}
        </Button>
      )}
    </div>
  );
});

export default PlayerCard;
