import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Q77: without `tailwind-merge`, `<Button size="md" className="px-2" />` emitted both
 * `px-3` and `px-2` and the winner depended on CSS source order rather than intent.
 * Later classes now beat earlier ones, which is what every caller already assumed.
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
