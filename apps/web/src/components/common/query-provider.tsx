'use client';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { Persister } from '@tanstack/query-persist-client-core';
import { useEffect, useState, type ReactNode } from 'react';
import { flushQueue } from '@/lib/offline/flush';
import { setQueryClient } from '@/lib/offline/cache';
import { createBudgetPersister } from '@/lib/offline/persister';

const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const noopPersister: Persister = {
  persistClient: async () => {},
  restoreClient: async () => undefined,
  removeClient: async () => {},
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
    typeof window === 'undefined' ? noopPersister : createBudgetPersister(),
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
