import { memo, useState } from 'react';
import type { BuyInEntry, CreditEntry, Player } from '@fnp/shared';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, UserMinus } from 'lucide-react';

import { usePreferences } from '../contexts/PreferencesContext';
import { exposureCents } from '../hooks/useSessionMode';

import NumberTicker from './NumberTicker';
import { Button } from './ui';

export interface PlayerCardActions {
    onBuyIn: (player: Player) => void;
    onCashOut: (player: Player) => void;
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
    /** Deepest exposure at the table, used to scale this player's bar against the rest. */
    deepestExposureCents: number;
}

/**
 * A player during play. Cash-out is deliberately *not* the primary action here: it happens
 * once per player per night, while buy-ins happen constantly, so the frequent action is
 * the one that gets the weight.
 *
 * Q94: `memo` is finally effective here. It was previously defeated by `usePreferences()`,
 * whose context value changed on every provider render because `t` was recreated each
 * time (Q72). With the context value stable, this only re-renders when its player does.
 */
const PlayerCard = memo(function PlayerCard({
    player,
    playerNames,
    editable,
    deepestExposureCents,
    onBuyIn,
    onCashOut,
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

    const exposure = exposureCents(player);
    const ahead = player.netBalanceCents > 0;
    const barPercent =
        deepestExposureCents > 0 ? Math.round((exposure / deepestExposureCents) * 100) : 0;

    return (
        <article className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{player.name}</h3>
                    <p className="text-sm text-dim">
                        <span className="money">
                            <NumberTicker
                                value={player.totalBuyInsCents}
                                formatter={formatCurrency}
                            />
                        </span>{' '}
                        {t('totalBuyIns').toLowerCase()}
                        {player.totalCreditsCents > 0 && (
                            <>
                                {' · '}
                                <span className="money">
                                    <NumberTicker
                                        value={player.totalCreditsCents}
                                        formatter={formatCurrency}
                                    />
                                </span>{' '}
                                {t('credits').toLowerCase()}
                            </>
                        )}
                    </p>
                </div>

                <div className="text-right shrink-0">
                    {/*
                     * Owing the house is the default state mid-game — you buy chips, so you
                     * are down until you lend some out. Colouring that amber painted the
                     * whole table as a warning and spent the palette on the unremarkable
                     * case. Only being *ahead* is notable, so only that gets a hue.
                     */}
                    <div className={`money text-lg font-semibold ${ahead ? 'text-receive' : ''}`}>
                        <NumberTicker
                            value={Math.abs(player.netBalanceCents)}
                            formatter={formatCurrency}
                        />
                    </div>
                    <div className="text-xs text-dim">
                        {ahead ? t('aheadOfHouse') : t('owesHouse')}
                    </div>
                </div>
            </div>

            {/*
             * Ambient rather than precise: how buried this player is compared with the
             * deepest player at the table. It answers the question people actually ask
             * across a table without anyone reading a number aloud.
             */}
            {deepestExposureCents > 0 && (
                <div className="exposure" aria-hidden="true">
                    <span
                        className={ahead ? 'bg-receive' : 'bg-text/30'}
                        style={{ width: `${ahead ? 100 : barPercent}%` }}
                    />
                </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
                {editable && (
                    <Button
                        size="sm"
                        aria-label={`${t('buyInFor')} ${player.name}`}
                        onClick={() => onBuyIn(player)}
                    >
                        <Plus size={14} />
                        {t('registerBuyIn')}
                    </Button>
                )}
                {editable && (
                    <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`${t('cashOutFor')} ${player.name}`}
                        onClick={() => onCashOut(player)}
                    >
                        {t('cashOut')}
                    </Button>
                )}
                {hasMovements && (
                    <Button
                        variant="secondary"
                        size="sm"
                        aria-expanded={showMovements}
                        aria-label={`${t('movementsOf')} ${player.name}`}
                        onClick={() => setShowMovements(value => !value)}
                    >
                        {showMovements ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {player.buyIns.length + player.credits.length}
                    </Button>
                )}
                {removable && (
                    <Button
                        variant="ghostDanger"
                        size="sm"
                        aria-label={`${t('removePlayerNamed')} ${player.name}`}
                        title={`${t('removePlayerNamed')} ${player.name}`}
                        className="ml-auto"
                        onClick={() => onRemovePlayer(player)}
                    >
                        <UserMinus size={14} />
                    </Button>
                )}
            </div>

            {/* `min-h-8` on every row keeps the rhythm even: rows carrying edit and delete
                controls used to stand taller than credit rows, which have none, so an
                equal gap between them read as unequal. */}
            {showMovements && (
                <ul className="border-t border-border pt-3 space-y-2 text-xs">
                    {player.buyIns.map(entry => (
                        <li key={entry.id} className="flex items-center gap-2 min-h-8">
                            <span className="flex-1 min-w-0">
                                <strong className="money">
                                    {formatCurrency(entry.amountCents)}
                                </strong>{' '}
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
                                        aria-label={`${t('editAmount')} — ${formatCurrency(entry.amountCents)}`}
                                        title={t('editAmount')}
                                        onClick={() => onEditBuyIn(player, entry)}
                                    >
                                        <Pencil size={12} />
                                    </Button>
                                    {player.buyIns.length > 1 && (
                                        <Button
                                            variant="ghostDanger"
                                            size="sm"
                                            aria-label={`${t('delete')} — ${formatCurrency(entry.amountCents)}`}
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
                        <li key={entry.id} className="flex items-center gap-2 min-h-8">
                            <span className="flex-1 min-w-0">
                                <strong className="money text-receive">
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
                                        aria-label={`${t('editAmount')} — ${formatCurrency(entry.amountCents)}`}
                                        title={t('editAmount')}
                                        onClick={() => onEditCredit(player, entry)}
                                    >
                                        <Pencil size={12} />
                                    </Button>
                                    <Button
                                        variant="ghostDanger"
                                        size="sm"
                                        aria-label={`${t('delete')} — ${formatCurrency(entry.amountCents)}`}
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
        </article>
    );
});

export default PlayerCard;
