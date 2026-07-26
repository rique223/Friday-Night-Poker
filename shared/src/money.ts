/**
 * Money is stored, transported and computed as **integer cents** everywhere (Q28).
 *
 * Only the presentation layer converts to a decimal amount, and only for display or
 * for seeding a number input. Nothing in the domain does float arithmetic.
 */

/** Largest amount we accept in a single movement: 1,000,000.00 in whatever currency. */
export const MAX_AMOUNT_CENTS = 100_000_000;

/** Converts a user-entered decimal amount (e.g. `12.5`) into integer cents (`1250`). */
export function toCents(amount: number | string): number {
    const value = typeof amount === 'string' ? Number(amount.replace(',', '.')) : amount;
    if (!Number.isFinite(value)) return Number.NaN;
    // Round rather than truncate so 0.1 + 0.2 style float error can't shave a cent off.
    return Math.round(value * 100);
}

/** Converts integer cents into a decimal amount suitable for `Intl.NumberFormat`. */
export function fromCents(cents: number): number {
    return cents / 100;
}
