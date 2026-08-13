import type { QueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { toDateKey } from '@/lib/utils';

/**
 * Warm the offline cache with the queries that power the most common flows
 * (view today's activity, log/start an activity) so they are available even
 * when the user goes offline without having visited every page. Runs once on
 * app load while online; prefetched data is persisted by the budget persister.
 */
export async function prefetchCoreQueries(client: QueryClient): Promise<void> {
  const today = toDateKey(new Date());
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  const weekStart = toDateKey(d);

  const results = await Promise.allSettled([
    client.prefetchQuery({ queryKey: ['categories'], queryFn: api.listCategories }),
    client.prefetchQuery({ queryKey: ['tags'], queryFn: api.listTags }),
    client.prefetchQuery({ queryKey: ['templates'], queryFn: api.listTemplates }),
    client.prefetchQuery({ queryKey: ['active-record'], queryFn: api.getActiveRecord }),
    client.prefetchQuery({
      queryKey: ['records', { from: today, to: today }],
      queryFn: () => api.listRecords({ from: today, to: today }),
    }),
    client.prefetchQuery({
      queryKey: ['records', { from: weekStart, to: today }],
      queryFn: () => api.listRecords({ from: weekStart, to: today }),
    }),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      // Best-effort warm-up; failures (e.g. not signed in yet) are harmless.
      void result.reason;
    }
  }
}
