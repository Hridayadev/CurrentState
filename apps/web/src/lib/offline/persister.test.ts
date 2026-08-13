import { beforeAll, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { QueryClient, dehydrate, hydrate } from '@tanstack/react-query';
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/query-persist-client-core';
import { createBudgetPersister } from '@/lib/offline/persister';

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 10_000, retry: 0 } },
  });
}

describe('budget persister round-trip', () => {
  beforeAll(async () => {
    await indexedDB.deleteDatabase('currentstate-query-cache');
  });

  it('persists and restores the query cache', async () => {
    const persister = createBudgetPersister();
    const client = makeClient();
    client.setQueryData(['categories'], [{ id: 'c1', name: 'Work' }]);
    client.setQueryData(['records', { from: '2026-08-13', to: '2026-08-13' }], [
      { id: 'r1', title: 'Deep work' },
    ]);

    await persistQueryClientSave({ queryClient: client, persister });

    const restored = makeClient();
    await persistQueryClientRestore({ queryClient: restored, persister, maxAge: 1000 * 60 * 60 * 24 * 7 });

    expect(restored.getQueryData(['categories'])).toEqual([{ id: 'c1', name: 'Work' }]);
    expect(restored.getQueryData(['records', { from: '2026-08-13', to: '2026-08-13' }])).toEqual([
      { id: 'r1', title: 'Deep work' },
    ]);
  });

  it('drops oldest heavy queries first when over budget', async () => {
    const persister = createBudgetPersister({ budgetBytes: 20_000 });
    const client = makeClient();
    // Keep small reference query always.
    client.setQueryData(['categories'], [{ id: 'c1', name: 'Work' }]);
    // Simulate a large records payload.
    const big: Array<{ id: string; blob: string }> = [];
    for (let i = 0; i < 40; i++) big.push({ id: `r${i}`, blob: 'x'.repeat(1024) });
    client.setQueryData(['records', { from: '2020-01-01', to: '2020-01-31' }], big);
    client.setQueryData(['records', { from: '2026-08-13', to: '2026-08-13' }], [{ id: 'r-today' }]);

    await persistQueryClientSave({ queryClient: client, persister });

    const restored = makeClient();
    await persistQueryClientRestore({ queryClient: restored, persister, maxAge: 1000 * 60 * 60 * 24 * 7 });

    // Categories always survive.
    expect(restored.getQueryData(['categories'])).toEqual([{ id: 'c1', name: 'Work' }]);
    // Newest heavy query survives; oldest (over-budget) is pruned.
    expect(restored.getQueryData(['records', { from: '2026-08-13', to: '2026-08-13' }])).toEqual([
      { id: 'r-today' },
    ]);
    expect(restored.getQueryData(['records', { from: '2020-01-01', to: '2020-01-31' }])).toBeUndefined();
  });
});

describe('hydrate() restores dehydrated queries', () => {
  it('hydrates the exact query keys used by the app', () => {
    const client = makeClient();
    client.setQueryData(['session'], { id: 'u1', displayName: 'A' });
    client.setQueryData(['templates'], [{ id: 't1', title: 'Deep work' }]);
    const dehydrated = dehydrate(client);

    const fresh = makeClient();
    hydrate(fresh, dehydrated);
    expect(fresh.getQueryData(['session'])).toEqual({ id: 'u1', displayName: 'A' });
    expect(fresh.getQueryData(['templates'])).toEqual([{ id: 't1', title: 'Deep work' }]);
  });
});
