import { createStore, del, get, set } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core';

const DB_NAME = 'currentstate-query-cache';
const STORE_NAME = 'queries';
const STORE_KEY = 'persistedClient';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // drop cache if the app wasn't opened for 7 days
const BUDGET_BYTES = 30 * 1024 * 1024; // 30 MB offline cache budget

/**
 * Lightweight reference queries that are always kept. They are small and power
 * offline writes (category/tag/template lookups, session profile).
 */
const LIGHT_PREFIXES = new Set([
  'session',
  'categories',
  'tags',
  'templates',
  'schedules',
  'notifications',
  'room',
  'partner',
  'active-record',
]);

/**
 * Large record-bearing queries (full activity history + derived analytics).
 * These are pruned oldest-first when the offline cache exceeds the budget.
 */
const HEAVY_PREFIXES = new Set([
  'records',
  'history',
  'timeline',
  'breakdown',
  'week-trend',
  'category-breakdown',
  'activity-breakdown',
  'partner-history',
  'partner-week-trend',
  'partner-category-breakdown',
  'partner-activity-breakdown',
]);

/**
 * IndexedDB persister that caps the size of the offline query cache.
 * - Always keeps small reference queries so the app stays usable offline.
 * - Keeps the most recently used record/analytics queries.
 * - Drops the oldest data queries first, so the budget is never exceeded.
 * - Restore fails after MAX_AGE_MS, deleting stale caches automatically.
 */
export function createBudgetPersister(): Persister {
  const store = createStore(DB_NAME, STORE_NAME);

  return {
    async persistClient(persistedClient) {
      let client = persistedClient;
      let json = JSON.stringify(client);
      if (json.length > BUDGET_BYTES) {
        client = { ...client, clientState: { ...client.clientState, queries: prune(client) } };
        json = JSON.stringify(client);
      }
      await set(STORE_KEY, json, store);
    },

    async restoreClient() {
      const raw = await get<string>(STORE_KEY, store);
      if (!raw) return undefined;
      try {
        const client = JSON.parse(raw) as PersistedClient;
        if (Date.now() - client.timestamp >= MAX_AGE_MS) {
          await del(STORE_KEY, store);
          return undefined;
        }
        return client;
      } catch {
        return undefined;
      }
    },

    async removeClient() {
      await del(STORE_KEY, store);
    },
  };
}

function prune(
  client: PersistedClient,
): PersistedClient['clientState']['queries'] {
  const queries = client.clientState.queries;
  const isHeavy = (q: (typeof queries)[number]) => HEAVY_PREFIXES.has(String(q.queryKey?.[0]));

  const light = queries.filter((q) => !isHeavy(q));
  const heavy = [...queries.filter(isHeavy)].sort(
    (a, b) => (b.state.dataUpdatedAt ?? 0) - (a.state.dataUpdatedAt ?? 0),
  );

  const kept: typeof queries = [...light];

  for (const query of heavy) {
    if (JSON.stringify([...kept, query]).length > BUDGET_BYTES) break;
    kept.push(query);
  }

  return kept;
}
