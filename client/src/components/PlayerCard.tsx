import { memo, useState } from 'react';
import type { BuyInEntry, CreditEntry, Player } from '@fnp/shared';
import { ChevronDown, ChevronUp, Pencil, RotateCcw, Trash2, UserMinus } from 'lucide-react';

import { usePreferences } from '../contexts/PreferencesContext';

import NumberTicker from './NumberTicker';
import { Button } from './ui';

export interface PlayerCardActions {
    onCashOut: (player: Player) => void;
    onUndoCashOut: (player: Player) => void;
    onRemovePlayer: (player: Player) => void;
    onEditBuyIn: (player: Player, entry: BuyInEntry) => void;
    onDeleteBuyIn: (player: Player, entry: BuyInEntry) => void;
    onEditCredit: (player: Player, entry: CreditEntry) => void;
    onDeleteCredit: (player: Player, entry: CreditEntry) => void;
}

interface PlayerCardProps extends PlayerCardActions {
    player: Player;
    /** Names by id, so a credit can say who it went to rather than showing a raw id. */
    playerNames: Map<number, string>;
    /** Editing is only offered while the session is open. */
    editable: boolean;
}

/**
 * Q94: `memo` is finally effective here. It was previously defeated by `usePreferences()`,
 * whose context value changed on every provider render because `t` was recreated each
 * time (Q72). With the context value stable, this only re-renders when its player does.
 */
const PlayerCard = memo(function PlayerCard({
    player,
    playerNames,
    editable,
    onCashOut,
    onUndoCashOut,
    onRemovePlayer,
    onEditBuyIn,
    onDeleteBuyIn,
    onEditCredit,
    onDeleteCredit,
}: PlayerCardProps) {
    const { t, formatCurrency, formatDateTime } = usePreferences();
    const [showMovements, setShowMovements] = useState(false);

    const hasMovements = player.buyIns.length > 0 || player.credits.length > 0;
    // Q7: a player can only be removed while they have nothing but their opening buy-in,
    // which mirrors what the server enforces.
    const removable =
        editable && player.isActive && player.buyIns.length === 1 && player.credits.length === 0;

    return (
        <div className="card p-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="font-semibold">
                        {player.name}{' '}
                        {!player.isActive && (
                            <span className="text-sm font-normal text-dim">
                                ({t('inactive').toLowerCase()})
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-dim">
                        {t('totalBuyIns')}:{' '}
                        <NumberTicker value={player.totalBuyInsCents} formatter={formatCurrency} />
                        {' · '}
                        {t('credits')}:{' '}
                        <NumberTicker value={player.totalCreditsCents} formatter={formatCurrency} />
                    </div>
                    <div className="text-xs text-dim">
                        {t('netBalance')}:{' '}
                        <NumberTicker value={player.netBalanceCents} formatter={formatCurrency} />
                    </div>
                    {!player.isActive && player.payoutCents !== null && (
                        <div className="text-xs">
                            {t('finalChips')}: {formatCurrency(player.finalChipCountCents ?? 0)} ·{' '}
                            {t('payout')}:{' '}
                            <strong
                                className={player.payoutCents >= 0 ? 'text-success' : 'text-danger'}
                            >
                                <NumberTicker
                                    value={player.payoutCents}
                                    formatter={formatCurrency}
                                />
                            </strong>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {hasMovements && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="inline-flex gap-1"
                            aria-expanded={showMovements}
                            onClick={() => setShowMovements(value => !value)}
                        >
                            {showMovements ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {showMovements ? t('hideMovements') : t('showMovements')}
                        </Button>
                    )}
                    {removable && (
                        <Button
                            variant="secondary"
                            size="sm"
                            aria-label={t('removePlayer')}
                            title={t('removePlayer')}
                            onClick={() => onRemovePlayer(player)}
                        >
                            <UserMinus size={14} />
                        </Button>
                    )}
                    {player.isActive && editable && (
                        <Button size="sm" onClick={() => onCashOut(player)}>
                            {t('cashOut')}
                        </Button>
                    )}
                    {!player.isActive && editable && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="inline-flex gap-1"
                            onClick={() => onUndoCashOut(player)}
                        >
                            <RotateCcw size={14} />
                            {t('undoCashOut')}
                        </Button>
                    )}
                </div>
            </div>

            {showMovements && (
                <ul className="border-t border-border pt-2 space-y-1 text-xs">
                    {player.buyIns.map(entry => (
                        <li key={entry.id} className="flex items-center gap-2">
                            <span className="flex-1 min-w-0">
                                <strong>{formatCurrency(entry.amountCents)}</strong>{' '}
                                <span className="text-dim">
                                    {entry.creditId
                                        ? `· ${t('creditFrom')} ${
                                              playerNames.get(entry.fromPlayerId ?? -1) ?? '—'
                                          }`
                                        : `· ${t('totalBuyIns')}`}{' '}
                                    · {formatDateTime(entry.createdAt)}
                                </span>
                            </span>
                            {/* The receiving half of a credit is edited from the provider's
                                side, so only plain buy-ins get controls here. */}
                            {editable && !entry.creditId && (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        aria-label={t('editAmount')}
                                        title={t('editAmount')}
                                        onClick={() => onEditBuyIn(player, entry)}
                                    >
                                        <Pencil size={12} />
                                    </Button>
                                    {player.buyIns.length > 1 && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            aria-label={t('delete')}
                                            title={t('delete')}
                                            onClick={() => onDeleteBuyIn(player, entry)}
                                        >
                                            <Trash2 size={12} />
                                        </Button>
                                    )}
                                </>
                            )}
                        </li>
                    ))}

                    {player.credits.map(entry => (
                        <li key={entry.id} className="flex items-center gap-2">
                            <span className="flex-1 min-w-0">
                                <strong className="text-success">
                                    {formatCurrency(entry.amountCents)}
                                </strong>{' '}
                                <span className="text-dim">
                                    · {t('creditTo')}{' '}
                                    {playerNames.get(entry.toPlayerId) ?? `#${entry.toPlayerId}`} ·{' '}
                                    {formatDateTime(entry.createdAt)}
                                </span>
                            </span>
                            {editable && (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        aria-label={t('editAmount')}
                                        title={t('editAmount')}
                                        onClick={() => onEditCredit(player, entry)}
                                    >
                                        <Pencil size={12} />
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        aria-label={t('delete')}
                                        title={t('delete')}
                                        onClick={() => onDeleteCredit(player, entry)}
                                    >
                                        <Trash2 size={12} />
                                    </Button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
});

export default PlayerCard;
