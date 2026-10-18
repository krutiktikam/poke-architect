import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';

export const ENCYCLOPEDIA_KEY_PREFIX = 'encyclopedia';
export const PERSISTER_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
export const ENCYCLOPEDIA_GC_TIME = 1000 * 60 * 60 * 24 * 7; // 7 days (>= persister maxAge)

export const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const val = await get<string>(key);
        return val ?? null;
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await set(key, value);
      } catch {
        // IDB write failure ignored
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        await del(key);
      } catch {
        // IDB delete failure ignored
      }
    },
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: ENCYCLOPEDIA_GC_TIME,
      staleTime: 1000 * 60 * 5,
      retry: (failureCount: number, error: unknown): boolean => {
        // Do not retry on 4xx client errors except 408 (timeout) and 429 (rate limit)
        if (error && typeof error === 'object' && 'response' in error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export const dehydrateOptions = {
  shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }): boolean => {
    return query.state.status === 'success' && query.queryKey[0] === ENCYCLOPEDIA_KEY_PREFIX;
  },
};
