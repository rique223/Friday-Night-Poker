/**
 * Every timestamp written to the database is ISO-8601 UTC with a `Z` (Q29).
 *
 * The old `datetime('now')` produced `"2026-07-25 15:16:28"`. V8 parses that
 * space-separated form as *local* time, so `new Date(createdAt)` in the browser
 * shifted every displayed timestamp by the viewer's UTC offset.
 *
 * Milliseconds are dropped so the format is fixed-width and lexicographic ordering
 * matches chronological ordering, which lets `ORDER BY created_at` use an index (Q34).
 */
export function nowIso(): string {
    return `${new Date().toISOString().slice(0, 19)}Z`;
}

/** Normalises a legacy `YYYY-MM-DD HH:MM:SS` (naive UTC) value to ISO-8601 UTC. */
export function toIsoUtc(value: string): string {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        return `${trimmed.replace(' ', 'T')}Z`;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return nowIso();
    return `${parsed.toISOString().slice(0, 19)}Z`;
}
