import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { BuyInEntry, CreditEntry, Player } from '@fnp/shared';
import { ArrowLeft, Plus } from 'lucide-react';

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
import SettlementView from '../components/SettlementView';
import { Button, LoadingSpinner } from '../components/ui';
import { usePreferences } from '../contexts/PreferencesContext';
import { useSession } from '../hooks/useSession';
import { useSessionView } from '../hooks/useSessionMode';

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
    const { t, formatDateTime, formatSessionDate } = usePreferences();

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

    const [buyInPlayer, setBuyInPlayer] = useState<Player | null>(null);
    const [creditOpen, setCreditOpen] = useState(false);
    const [cashOutPlayer, setCashOutPlayer] = useState<Player | null>(null);
    const [editing, setEditing] = useState<Editing>(null);
    const [confirming, setConfirming] = useState<Confirming>(null);
    const [addingPlayer, setAddingPlayer] = useState(false);
    const [playersTab, setPlayersTab] = useState<'atTable' | 'cashedOut'>('atTable');

    const players = useMemo(() => session?.players ?? [], [session?.players]);
    const playerNames = useMemo(
        () => new Map(players.map(player => [player.id, player.name])),
        [players],
    );
    const view = useSessionView(session);

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
                <p>{t('sessionNotFound')}</p>
                <Button variant="secondary" onClick={() => navigate('/')}>
                    {t('back')}
                </Button>
            </div>
        );
    }

    const { mode, atTable, editable, deepestExposureCents } = view;
    const hasActivePlayers = atTable.length > 0;

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
            <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/')}
                    className="order-1 inline-flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> {t('back')}
                </Button>

                <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1">
                    <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 min-w-0">
                        <span className="min-w-0">{formatSessionDate(session.createdAt)}</span>
                        {mode !== 'settlement' && (
                            <span className="inline-flex items-center gap-1.5 shrink-0">
                                <span className="live-dot" aria-hidden="true" />
                                <span className="text-xs font-normal text-dim">{t('live')}</span>
                            </span>
                        )}
                    </h1>
                    <p className="text-xs text-dim break-words">
                        {t('session')} #{session.id} · {formatDateTime(session.createdAt)}
                        {session.createdBy ? ` · ${t('createdBy')} ${session.createdBy}` : ''}
                    </p>
                </div>

                <HeaderActions
                    className="order-2 ml-auto sm:order-3 sm:ml-0"
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

            {mode === 'setup' && (
                <section className="space-y-3">
                    <div>
                        <h2 className="text-lg font-semibold">{t('setupTitle')}</h2>
                        <p className="text-sm text-dim">{t('setupHint')}</p>
                    </div>
                    <AddPlayerForm
                        onSubmit={payload => addPlayer.mutateAsync(payload).then(() => undefined)}
                        disabled={addPlayer.isPending}
                        showTitle={false}
                    />
                </section>
            )}

            {mode === 'play' && (
                <>
                    <section className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <div role="tablist" aria-label={t('players')} className="flex gap-2">
                                <Button
                                    role="tab"
                                    id="tab-at-table"
                                    aria-selected={playersTab === 'atTable'}
                                    aria-controls="panel-at-table"
                                    variant={playersTab === 'atTable' ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setPlayersTab('atTable')}
                                >
                                    {t('atTable')} · {atTable.length}
                                </Button>
                                <Button
                                    role="tab"
                                    id="tab-cashed-out"
                                    aria-selected={playersTab === 'cashedOut'}
                                    aria-controls="panel-cashed-out"
                                    variant={playersTab === 'cashedOut' ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setPlayersTab('cashedOut')}
                                >
                                    {t('cashedOutPlural')} · {view.cashedOut.length}
                                </Button>
                            </div>
                            {isFetching && <LoadingSpinner size="sm" />}
                        </div>

                        {playersTab === 'atTable' ? (
                            <div
                                role="tabpanel"
                                id="panel-at-table"
                                aria-labelledby="tab-at-table"
                                className="grid gap-2"
                            >
                                {atTable.map(player => (
                                    <PlayerCard
                                        key={player.id}
                                        player={player}
                                        playerNames={playerNames}
                                        editable={editable}
                                        deepestExposureCents={deepestExposureCents}
                                        onBuyIn={setBuyInPlayer}
                                        onCashOut={setCashOutPlayer}
                                        onRemovePlayer={p =>
                                            setConfirming({ kind: 'removePlayer', player: p })
                                        }
                                        onEditBuyIn={(_p, entry) =>
                                            setEditing({ kind: 'buyIn', entry })
                                        }
                                        onDeleteBuyIn={(_p, entry) =>
                                            setConfirming({ kind: 'deleteBuyIn', entry })
                                        }
                                        onEditCredit={(_p, entry) =>
                                            setEditing({ kind: 'credit', entry })
                                        }
                                        onDeleteCredit={(_p, entry) =>
                                            setConfirming({ kind: 'deleteCredit', entry })
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            <div
                                role="tabpanel"
                                id="panel-cashed-out"
                                aria-labelledby="tab-cashed-out"
                            >
                                <SettlementView
                                    view={view}
                                    editable={editable}
                                    onUndoCashOut={p =>
                                        setConfirming({ kind: 'undoCashOut', player: p })
                                    }
                                />
                            </div>
                        )}
                    </section>

                    {editable && (
                        <section className="space-y-3">
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant="secondary"
                                    onClick={() => setAddingPlayer(open => !open)}
                                    aria-expanded={addingPlayer}
                                >
                                    <Plus size={16} />
                                    {t('addPlayer')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    disabled={atTable.length < 2}
                                    onClick={() => setCreditOpen(true)}
                                >
                                    {t('registerCredit')}
                                </Button>
                            </div>
                            {addingPlayer && (
                                <AddPlayerForm
                                    onSubmit={payload =>
                                        addPlayer.mutateAsync(payload).then(() => {
                                            setAddingPlayer(false);
                                        })
                                    }
                                    disabled={addPlayer.isPending}
                                />
                            )}
                        </section>
                    )}

                    {editable && hasActivePlayers && (
                        <p className="text-xs text-dim">{t('cashOutAllFirst')}</p>
                    )}
                </>
            )}

            {mode === 'settlement' && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="eyebrow">{t('settlement')}</h2>
                        {isFetching && <LoadingSpinner size="sm" />}
                    </div>
                    <SettlementView
                        view={view}
                        editable={editable}
                        onUndoCashOut={p => setConfirming({ kind: 'undoCashOut', player: p })}
                    />
                </section>
            )}

            <Modal
                title={buyInPlayer ? `${t('buyInFor')} ${buyInPlayer.name}` : t('registerBuyIn')}
                open={buyInPlayer !== null}
                onClose={() => setBuyInPlayer(null)}
            >
                <BuyInForm
                    players={players}
                    player={buyInPlayer ?? undefined}
                    onSubmit={async payload => {
                        await registerBuyIn.mutateAsync(payload);
                        setBuyInPlayer(null);
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
