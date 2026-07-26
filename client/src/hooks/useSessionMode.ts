import { useMemo } from 'react';
import type { Player, SessionDetail } from '@fnp/shared';

/**
 * A night has three shapes, and they want different screens.
 *
 * The page used to render one layout for all of them, which is why an ended session
 * opened on an empty "active players" tab and showed "no movements" — the finished night,
 * the entire point of the app, was hidden behind a tab nobody had a reason to press.
 */
export type SessionMode = 'setup' | 'play' | 'settlement';

/** A player past cash-out, where `payoutCents` is guaranteed to be a number. */
export type SettledPlayer = Player & { payoutCents: number };

export interface SessionView {
    mode: SessionMode;
    /** Still holding chips. */
    atTable: Player[];
    /** Cashed out, so they have a payout. */
    cashedOut: Player[];
    /** The house owes these players money, largest first. */
    receiving: SettledPlayer[];
    /** These players owe the house money, largest first. */
    paying: SettledPlayer[];
    /** Cashed out exactly even. */
    even: SettledPlayer[];
    /** Movements are only accepted while the session is open. */
    editable: boolean;
    /** Deepest single exposure at the table, for scaling the exposure bars. */
    deepestExposureCents: number;
}

/** What a player owes the house right now; zero once they are ahead. */
export function exposureCents(player: Player): number {
    return player.netBalanceCents < 0 ? -player.netBalanceCents : 0;
}

export function useSessionView(session: SessionDetail | undefined): SessionView {
    return useMemo(() => {
        const players = session?.players ?? [];
        const atTable = players.filter(p => p.isActive);
        const cashedOut = players.filter(p => !p.isActive);

        // `payoutCents` is null until a player cashes out, so these three partitions only
        // ever draw from `cashedOut` and never have to guard for null again downstream.
        const withPayout = cashedOut.filter((p): p is SettledPlayer => p.payoutCents !== null);
        const byMagnitude = (a: SettledPlayer, b: SettledPlayer) =>
            Math.abs(b.payoutCents) - Math.abs(a.payoutCents);

        const receiving = withPayout.filter(p => p.payoutCents > 0).sort(byMagnitude);
        const paying = withPayout.filter(p => p.payoutCents < 0).sort(byMagnitude);
        const even = withPayout.filter(p => p.payoutCents === 0);

        const editable = session?.status === 'open';

        // An open session with nobody left at the table has finished in every sense that
        // matters to the operator, even though it has not been formally ended yet — that
        // is exactly the moment they need the payouts, so show them.
        const mode: SessionMode =
            !editable || (players.length > 0 && atTable.length === 0)
                ? 'settlement'
                : players.length === 0
                  ? 'setup'
                  : 'play';

        return {
            mode,
            atTable,
            cashedOut,
            receiving,
            paying,
            even,
            editable,
            deepestExposureCents: atTable.reduce((max, p) => Math.max(max, exposureCents(p)), 0),
        };
    }, [session]);
}
