import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { BuyInEntry, CreditEntry, Player } from '@fnp/shared';
import { ArrowLeft } from 'lucide-react';

import ConfirmDialog from '../components/ConfirmDialog';
import AddPlayerForm from '../components/forms/AddPlayerForm';
import BuyInForm from '../components/forms/BuyInForm';
import CashOutForm from '../components/forms/CashOutForm';
import CreditForm from '../components/forms/CreditForm';
import EditAmountForm from '../components/forms/EditAmountForm';
import HeaderActions from '../components/HeaderActions';
import Modal from '../components/Modal';
import PlayerCard from '../components/PlayerCard';
import PlayerCardSkeleton from '../components/PlayerCardSkeleton';
import { Button, LoadingSpinner } from '../components/ui';
import { usePreferences } from '../contexts/PreferencesContext';
import { useSession } from '../hooks/useSession';

type Editing = { kind: 'buyIn'; entry: BuyInEntry } | { kind: 'credit'; entry: CreditEntry } | null;

type Confirming =
    | { kind: 'endSession' }
    | { kind: 'removePlayer'; player: Player }
    | { kind: 'undoCashOut'; player: Player }
    | { kind: 'deleteBuyIn'; entry: BuyInEntry }
    | { kind: 'deleteCredit'; entry: CreditEntry }
    | null;

export default function SessionDetailPage() {
    const { id } = useParams();
    const sessionId = Number(id);
    const navigate = useNavigate();
    const { t, formatDateTime } = usePreferences();

    const {
        session,
        isLoading,
        isFetching,
        addPlayer,
        removePlayer,
        registerBuyIn,
        updateBuyIn,
        deleteBuyIn,
        registerCredit,
        updateCredit,
        deleteCredit,
        cashOut,
        undoCashOut,
        endSession,
    } = useSession(sessionId);

    const [buyInOpen, setBuyInOpen] = useState(false);
    const [creditOpen, setCreditOpen] = useState(false);
    const [cashOutPlayer, setCashOutPlayer] = useState<Player | null>(null);
    const [editing, setEditing] = useState<Editing>(null);
    const [confirming, setConfirming] = useState<Confirming>(null);
    const [playersTab, setPlayersTab] = useState<'active' | 'inactive'>('active');

    const players = useMemo(() => session?.players ?? [], [session?.players]);
    const playerNames = useMemo(
        () => new Map(players.map(player => [player.id, player.name])),
        [players],
    );
    const activePlayers = useMemo(() => players.filter(p => p.isActive), [players]);
    const inactivePlayers = useMemo(() => players.filter(p => !p.isActive), [players]);

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-2">
                {[0, 1, 2, 3].map(key => (
                    <PlayerCardSkeleton key={key} />
                ))}
            </div>
        );
    }

    if (!session) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-4 text-center">
                {/* Q81: this was a hardcoded English "Session not found". */}
                <p>{t('sessionNotFound')}</p>
                <Button variant="secondary" onClick={() => navigate('/')}>
                    {t('back')}
                </Button>
            </div>
        );
    }

    // Q39: an archived session is frozen, and an ended one takes no further movements.
    const editable = session.status === 'open';
    const hasActivePlayers = activePlayers.length > 0;
    const displayedPlayers = playersTab === 'active' ? activePlayers : inactivePlayers;

    const closeConfirm = () => setConfirming(null);

    const confirmCopy: Record<
        NonNullable<Confirming>['kind'],
        { title: string; body: string; label: string }
    > = {
        endSession: {
            title: t('confirmEndSessionTitle'),
            body: t('confirmEndSession'),
            label: t('endSession'),
        },
        removePlayer: {
            title: t('confirmRemovePlayerTitle'),
            body: t('confirmRemovePlayerBody'),
            label: t('remove'),
        },
        undoCashOut: {
            title: t('confirmUndoCashOutTitle'),
            body: t('confirmUndoCashOutBody'),
            label: t('undo'),
        },
        deleteBuyIn: {
            title: t('confirmDeleteBuyInTitle'),
            body: t('confirmDeleteBuyInBody'),
            label: t('delete'),
        },
        deleteCredit: {
            title: t('confirmDeleteCreditTitle'),
            body: t('confirmDeleteCreditBody'),
            label: t('delete'),
        },
    };

    const confirmBusy =
        endSession.isPending ||
        removePlayer.isPending ||
        undoCashOut.isPending ||
        deleteBuyIn.isPending ||
        deleteCredit.isPending;

    function runConfirmedAction() {
        if (!confirming) return;
        const settle = { onSettled: closeConfirm };
        switch (confirming.kind) {
            case 'endSession':
                endSession.mutate(undefined, {
                    onSuccess: () => navigate('/'),
                    onSettled: closeConfirm,
                });
                break;
            case 'removePlayer':
                removePlayer.mutate(confirming.player.id, settle);
                break;
            case 'undoCashOut':
                undoCashOut.mutate(confirming.player.id, settle);
                break;
            case 'deleteBuyIn':
                deleteBuyIn.mutate(confirming.entry.id, settle);
                break;
            case 'deleteCredit':
                deleteCredit.mutate(confirming.entry.creditId, settle);
                break;
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> {t('back')}
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold truncate">
                            {t('session')} #{session.id}
                        </h1>
                        {/* Q48: `getSession` never selected `created_by`, so the detail page
                            believed it had a creator and always got `undefined`. */}
                        <p className="text-xs text-dim truncate">
                            {formatDateTime(session.createdAt)}
                            {session.createdBy ? ` · ${t('createdBy')} ${session.createdBy}` : ''}
                        </p>
                    </div>
                </div>

                <HeaderActions
                    showLogout
                    extraMenuItems={
                        session.status === 'open' ? (
                            <Button
                                variant="danger"
                                className="w-full"
                                disabled={hasActivePlayers || endSession.isPending}
                                onClick={() => setConfirming({ kind: 'endSession' })}
                            >
                                {t('endSession')}
                            </Button>
                        ) : undefined
                    }
                />
            </header>

            {!editable && (
                <p className="card p-3 text-sm text-dim">
                    {t(
                        session.status === 'archived'
                            ? 'error_SESSION_ARCHIVED'
                            : 'sessionReadOnly',
                    )}
                </p>
            )}

            {editable && (
                <>
                    <AddPlayerForm
                        onSubmit={payload => addPlayer.mutateAsync(payload).then(() => undefined)}
                        disabled={addPlayer.isPending}
                    />

                    <section className="card p-5 flex gap-3">
                        <Button
                            className="flex-1"
                            disabled={activePlayers.length === 0}
                            onClick={() => setBuyInOpen(true)}
                        >
                            {t('registerBuyIn')}
                        </Button>
                        <Button
                            variant="secondary"
                            className="flex-1"
                            disabled={activePlayers.length < 2}
                            onClick={() => setCreditOpen(true)}
                        >
                            {t('registerCredit')}
                        </Button>
                    </section>
                </>
            )}

            <section className="card p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 className="font-semibold">{t('players')}</h2>
                    {isFetching && <LoadingSpinner size="sm" />}
                </div>

                <div className="mb-3 flex items-center gap-2">
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

                {/* Q87: the end-session hint used to live only in a `title` attribute, which
                    does not exist on touch devices — where this app is mostly used. It is
                    visible text now, and the button is genuinely disabled rather than
                    toasting on click. */}
                {editable && hasActivePlayers && playersTab === 'active' && (
                    <p className="mb-3 text-xs text-dim">{t('cashOutAllFirst')}</p>
                )}

                <div className="grid gap-2">
                    {displayedPlayers.map(player => (
                        <PlayerCard
                            key={player.id}
                            player={player}
                            playerNames={playerNames}
                            editable={editable}
                            onCashOut={setCashOutPlayer}
                            onUndoCashOut={p => setConfirming({ kind: 'undoCashOut', player: p })}
                            onRemovePlayer={p => setConfirming({ kind: 'removePlayer', player: p })}
                            onEditBuyIn={(_p, entry) => setEditing({ kind: 'buyIn', entry })}
                            onDeleteBuyIn={(_p, entry) =>
                                setConfirming({ kind: 'deleteBuyIn', entry })
                            }
                            onEditCredit={(_p, entry) => setEditing({ kind: 'credit', entry })}
                            onDeleteCredit={(_p, entry) =>
                                setConfirming({ kind: 'deleteCredit', entry })
                            }
                        />
                    ))}
                    {displayedPlayers.length === 0 && (
                        <p className="text-sm text-dim">{t('noMovements')}</p>
                    )}
                </div>
            </section>

            <Modal title={t('registerBuyIn')} open={buyInOpen} onClose={() => setBuyInOpen(false)}>
                <BuyInForm
                    players={players}
                    onSubmit={async payload => {
                        await registerBuyIn.mutateAsync(payload);
                        setBuyInOpen(false);
                    }}
                />
            </Modal>

            <Modal
                title={t('registerCredit')}
                open={creditOpen}
                onClose={() => setCreditOpen(false)}
            >
                <CreditForm
                    players={players}
                    onSubmit={async payload => {
                        await registerCredit.mutateAsync(payload);
                        setCreditOpen(false);
                    }}
                />
            </Modal>

            <Modal
                title={t('cashOut')}
                open={cashOutPlayer !== null}
                onClose={() => setCashOutPlayer(null)}
            >
                {cashOutPlayer && (
                    <CashOutForm
                        player={cashOutPlayer}
                        onSubmit={async payload => {
                            await cashOut.mutateAsync(payload);
                            setCashOutPlayer(null);
                        }}
                    />
                )}
            </Modal>

            <Modal title={t('editAmount')} open={editing !== null} onClose={() => setEditing(null)}>
                {editing && (
                    <EditAmountForm
                        currentAmountCents={editing.entry.amountCents}
                        onSubmit={async amountCents => {
                            if (editing.kind === 'buyIn') {
                                await updateBuyIn.mutateAsync({
                                    entryId: editing.entry.id,
                                    amountCents,
                                });
                            } else {
                                await updateCredit.mutateAsync({
                                    creditId: editing.entry.creditId,
                                    amountCents,
                                });
                            }
                            setEditing(null);
                        }}
                    />
                )}
            </Modal>

            <ConfirmDialog
                open={confirming !== null}
                title={confirming ? confirmCopy[confirming.kind].title : ''}
                body={confirming ? confirmCopy[confirming.kind].body : ''}
                confirmLabel={confirming ? confirmCopy[confirming.kind].label : undefined}
                destructive={confirming?.kind !== 'undoCashOut'}
                busy={confirmBusy}
                onCancel={closeConfirm}
                onConfirm={runConfirmedAction}
            />
        </div>
    );
}
