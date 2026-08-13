import type { QueryClient } from '@tanstack/react-query';

let ref: QueryClient | null = null;

export function setQueryClient(client: QueryClient): void {
  ref = client;
}

export function getQueryClient(): QueryClient {
  if (!ref) throw new Error('QueryClient not ready');
  return ref;
}

/** Best-effort: read a single-key query (e.g. ['categories']) from cache. */
export function cachedList<T>(key: string): T[] | undefined {
  const client = ref;
  if (!client) return undefined;
  return client.getQueryData<T[]>([key]);
}

/** Best-effort: read the signed-in user id from the cached session. */
export function cachedUserId(): string | undefined {
  const client = ref;
  if (!client) return undefined;
  const user = client.getQueryData<{ id: string } | null>(['session']);
  return user?.id;
}

/** Best-effort: read the cached session user object. */
export function getCachedSessionUser<T>(): T | undefined {
  const client = ref;
  if (!client) return undefined;
  return client.getQueryData<T>(['session']) ?? undefined;
}

/** Best-effort: write the cached session user object (optimistic offline updates). */
export function setCachedSessionUser<T>(user: T): void {
  const client = ref;
  if (!client) return;
  client.setQueryData(['session'], user);
}

/** Best-effort: find an item by predicate across list queries with the given prefixes. */
export function cachedFindByKey<T>(pred: (item: T) => boolean, prefixes: string[]): T | undefined {
  const client = ref;
  if (!client) return undefined;
  for (const query of client.getQueryCache().getAll()) {
    const data = query.state.data;
    if (!Array.isArray(data)) continue;
    if (typeof query.queryKey[0] !== 'string') continue;
    if (!prefixes.includes(query.queryKey[0] as string)) continue;
    const found = (data as T[]).find(pred);
    if (found) return found;
  }
  return undefined;
}
