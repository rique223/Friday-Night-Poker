import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { usePreferences } from '../contexts/PreferencesContext';
import { errorKeyFor, type TranslationKey } from '../i18n';
import { ApiClientError } from '../services/apiClient';

/**
 * Turns any thrown value into a message in the user's language (Q71).
 *
 * The server returns a machine-readable `code`; each code has a translation key, so a
 * Portuguese user finally sees "Realize o cash out de todos os jogadores…" instead of
 * the English server prose — or, before Q53 was fixed, instead of
 * "Request failed with status code 400".
 */
export function useApiError() {
    const { t } = usePreferences();

    const messageFor = useCallback(
        (error: unknown, fallbackKey: TranslationKey) => {
            if (error instanceof ApiClientError) return t(errorKeyFor(error.code));
            return t(fallbackKey);
        },
        [t],
    );

    const toastError = useCallback(
        (error: unknown, fallbackKey: TranslationKey) => {
            toast.error(messageFor(error, fallbackKey));
        },
        [messageFor],
    );

    return { messageFor, toastError };
}
