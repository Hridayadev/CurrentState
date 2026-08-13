import { isOnline } from './connectivity';
import { getQueue, replaceQueue, type QueuedOp } from './storage';
import { EXECUTORS } from './executors';
import { getQueryClient } from './cache';

let flushing = false;

/**
 * Replay queued offline writes against Supabase, in order. Stops on the first
 * failure to preserve ordering; remaining ops stay queued for the next retry.
 * On any successful sync, invalidates the query cache so server truth replaces
 * the optimistic local values.
 */
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (!isOnline()) return;

  const queue = await getQueue();
  if (queue.length === 0) return;

  flushing = true;
  try {
    const processed: QueuedOp[] = [];
    for (const op of queue) {
      const executor = EXECUTORS[op.op];
      if (!executor) {
        processed.push(op);
        continue;
      }
      try {
        await executor(op.payload);
        processed.push(op);
      } catch {
        // First failure stops the flush; keep the remainder (incl. this one) queued.
        break;
      }
    }

    if (processed.length > 0) {
      await replaceQueue(queue.filter((op) => !processed.includes(op)));
      getQueryClient().invalidateQueries();
    }
  } finally {
    flushing = false;
  }
}
