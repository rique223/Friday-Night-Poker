/** Q74: `pageSize: 10` used to be typed out in four separate places. */
export const PAGE_SIZE = 10;

/** How long a fetched session stays fresh before React Query revalidates it. */
export const SESSION_STALE_TIME_MS = 15_000;

export const STORAGE_KEYS = {
    lang: 'lang',
    currency: 'currency',
    theme: 'theme',
    lastInitialBuyIn: 'lastInitialBuyIn',
} as const;
