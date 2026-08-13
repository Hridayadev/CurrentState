'use client';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { createStore, del, get, set } from 'idb-keyval';
import { useEffect, useState, type ReactNode } from 'react';
import { flushQueue } from '@/lib/offline/flush';
import { setQueryClient } from '@/lib/offline/cache';

const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function createIdbStorage() {
  const store = createStore('currentstate-query-cache', 'queries');
  return {
    getItem: async (key: string) => (await get<string>(key, store)) ?? null,
    setItem: async (key: string, value: string) => {
      await set(key, value, store);
    },
    removeItem: async (key: string) => {
      await del(key, store);
    },
  };
}

const memoryStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: typeof window === 'undefined' ? memoryStorage : createIdbStorage(),
    }),
  );

  useEffect(() => {
    setQueryClient(client);
    void flushQueue();
    const onOnline = () => void flushQueue();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [client]);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: MAX_AGE,
        dehydrateOptions: { shouldDehydrateQuery: () => true },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
