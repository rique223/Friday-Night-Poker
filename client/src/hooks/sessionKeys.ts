import type { SessionStatus } from '@fnp/shared';

import type { GroupBy } from '../i18n/types';

export interface ListParams {
    status: SessionStatus | 'all';
    page: number;
    pageSize: number;
    q: string;
    groupBy: GroupBy;
}

/** Query keys live apart from the hooks so both list and detail can invalidate each other. */
export const sessionKeys = {
    all: ['sessions'] as const,
    list: (params: ListParams) => ['sessions', 'list', params] as const,
    detail: (id: number) => ['sessions', 'detail', id] as const,
};
