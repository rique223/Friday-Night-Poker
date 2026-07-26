import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TranslationKey } from '../i18n';

import { useApiError } from './useApiError';

/**
 * A mutation that reports both outcomes and refreshes the session cache.
 *
 * Success and failure messaging used to be copy-pasted into every mutation in
 * `useSession`/`useSessions`, which is how `archiveSession` ended up toasting
 * `failedEndSession` (Q57).
 */
export function useToastMutation<TArgs, TResult>(options: {
    mutationFn: (args: TArgs) => Promise<TResult>;
    successMessage: (result: TResult, args: TArgs) => string;
    errorKey: TranslationKey;
    invalidateKey: readonly unknown[];
}) {
    const queryClient = useQueryClient();
    const { toastError } = useApiError();

    return useMutation({
        mutationFn: options.mutationFn,
        onSuccess: async (result, args) => {
            toast.success(options.successMessage(result, args));
            await queryClient.invalidateQueries({ queryKey: options.invalidateKey });
        },
        onError: (error: unknown) => toastError(error, options.errorKey),
    });
}
