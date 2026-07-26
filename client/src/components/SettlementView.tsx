import { memo } from 'react';
import type { Player } from '@fnp/shared';
import { RotateCcw } from 'lucide-react';

import { usePreferences } from '../contexts/PreferencesContext';
import type { SessionView, SettledPlayer } from '../hooks/useSessionMode';

import { Button } from './ui';

type Direction = 'receive' | 'pay' | 'even';

interface SettlementViewProps {
    view: SessionView;
    /** Undo is only offered while the session is still open. */
    editable: boolean;
    onUndoCashOut: (player: Player) => void;
}

interface SettlementRowProps {
    player: SettledPlayer;
    direction: Direction;
    editable: boolean;
    onUndoCashOut: (player: Player) => void;
}

function SettlementRow({ player, direction, editable, onUndoCashOut }: SettlementRowProps) {
    const { t, formatCurrency } = usePreferences();

    const verb = direction === 'receive' ? t('receives') : direction === 'pay' ? t('pays') : null;
    const tone =
        direction === 'receive' ? 'text-receive' : direction === 'pay' ? 'text-pay' : 'text-dim';

    return (
        <li className="flex items-end justify-between gap-4 py-4 border-b border-border last:border-0">
            <div className="min-w-0">
                <h3 className="text-base font-semibold truncate">{player.name}</h3>
                {/*
                 * Direction is carried by the verb first and the colour second. The old
                 * card leaned entirely on red-vs-green plus a minus sign, which is the
                 * one pairing a colourblind reader cannot resolve — and this is the
                 * number someone hands over actual money for.
                 */}
                <p className={`text-sm ${tone}`}>{verb ?? t('settled')}</p>
                <p className="text-xs text-dim mt-1">
                    <span className="money">{formatCurrency(player.totalBuyInsCents)}</span>{' '}
                    {t('totalBuyIns').toLowerCase()}
                    {player.totalCreditsCents > 0 && (
                        <>
                            {' · '}
                            <span className="money">
                                {formatCurrency(player.totalCreditsCents)}
                            </span>{' '}
                            {t('credits').toLowerCase()}
                        </>
                    )}
                    {' · '}
                    <span className="money">
                        {formatCurrency(player.finalChipCountCents ?? 0)}
                    </span>{' '}
                    {t('finalChips').toLowerCase()}
                </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {editable && (
                    <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`${t('undoCashOutFor')} ${player.name}`}
                        title={`${t('undoCashOutFor')} ${player.name}`}
                        onClick={() => onUndoCashOut(player)}
                    >
                        <RotateCcw size={14} />
                    </Button>
                )}
                {/* The figure is the largest thing on the row because it is the answer. */}
                <span className={`money text-2xl sm:text-3xl font-semibold tabular-nums ${tone}`}>
                    {formatCurrency(Math.abs(player.payoutCents))}
                </span>
            </div>
        </li>
    );
}

function Group({
    label,
    players,
    direction,
    editable,
    onUndoCashOut,
}: {
    label: string;
    players: SettledPlayer[];
    direction: Direction;
    editable: boolean;
    onUndoCashOut: (player: Player) => void;
}) {
    if (players.length === 0) return null;

    return (
        <section className="card px-5 py-2">
            <h2 className="eyebrow pt-3 pb-1">{label}</h2>
            <ul>
                {players.map(player => (
                    <SettlementRow
                        key={player.id}
                        player={player}
                        direction={direction}
                        editable={editable}
                        onUndoCashOut={onUndoCashOut}
                    />
                ))}
            </ul>
        </section>
    );
}

/**
 * The end of a night, which is what the app is for. Payouts are grouped by which way the
 * money moves, so the operator reads two short lists instead of decoding a signed number
 * per player.
 */
const SettlementView = memo(function SettlementView({
    view,
    editable,
    onUndoCashOut,
}: SettlementViewProps) {
    const { t } = usePreferences();

    if (view.cashedOut.length === 0) {
        return <p className="card p-5 text-sm text-dim">{t('nobodyCashedOut')}</p>;
    }

    return (
        <div className="space-y-4">
            <Group
                label={t('housePays')}
                players={view.receiving}
                direction="receive"
                editable={editable}
                onUndoCashOut={onUndoCashOut}
            />
            <Group
                label={t('paysHouse')}
                players={view.paying}
                direction="pay"
                editable={editable}
                onUndoCashOut={onUndoCashOut}
            />
            <Group
                label={t('evenPlayers')}
                players={view.even}
                direction="even"
                editable={editable}
                onUndoCashOut={onUndoCashOut}
            />
        </div>
    );
});

export default SettlementView;
