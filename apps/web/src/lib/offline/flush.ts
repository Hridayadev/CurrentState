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
 *
 * Id references between ops (e.g. "start a timer with a template I created
 * offline") are resolved via a client-id → server-id map that is built as each
 * create op flushes, so later ops reference the real server ids.
 */
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (!isOnline()) return;

  const queue = await getQueue();
  if (queue.length === 0) return;

  flushing = true;
  try {
    const processed: QueuedOp[] = [];
    const idMap = new Map<string, string>();

    for (const op of queue) {
      const executor = EXECUTORS[op.op];
      if (!executor) {
        processed.push(op);
        continue;
      }
      const payload = remapPayload(op.op, op.payload, idMap);
      try {
        const result = await executor(payload);
        registerIdMapping(payload, result, idMap);
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

function remap(id: unknown, idMap: Map<string, string>): unknown {
  return typeof id === 'string' && idMap.has(id) ? idMap.get(id) : id;
}

/** @internal exported for tests */
export function remapPayload(op: string, payload: unknown, idMap: Map<string, string>): unknown {
  switch (op) {
    case 'startTimer': {
      const p = payload as { templateId: string };
      return { ...p, templateId: remap(p.templateId, idMap) };
    }
    case 'createSchedule': {
      const p = payload as { templateId: string };
      return { ...p, templateId: remap(p.templateId, idMap) };
    }
    case 'createManualRecord': {
      const p = payload as { templateId: string; tagIds?: string[] };
      return {
        ...p,
        templateId: remap(p.templateId, idMap),
        tagIds: (p.tagIds ?? []).map((id) => remap(id, idMap)),
      };
    }
    case 'updateRecord': {
      const p = payload as { id: string; input: { tagIds?: string[] } };
      return {
        ...p,
        id: remap(p.id, idMap),
        input: { ...p.input, tagIds: (p.input.tagIds ?? []).map((id) => remap(id, idMap)) },
      };
    }
    case 'stopRecord': {
      const p = payload as { id: string; endedAt: string };
      return { ...p, id: remap(p.id, idMap) };
    }
    case 'updateCategory': {
      const p = payload as { id: string };
      return { ...p, id: remap(p.id, idMap) };
    }
    case 'deleteRecord':
    case 'deleteCategory':
    case 'deleteTag':
    case 'deleteTemplate':
    case 'deleteSchedule':
      return remap(payload, idMap);
    case 'createTemplate': {
      const p = payload as { categoryId: string };
      return { ...p, categoryId: remap(p.categoryId, idMap) };
    }
    default:
      return payload;
  }
}

/** @internal exported for tests */
export function registerIdMapping(payload: unknown, result: unknown, idMap: Map<string, string>): void {
  const clientId = (payload as { clientId?: string } | null)?.clientId;
  const serverId = (result as { id?: string } | null)?.id;
  if (typeof clientId === 'string' && typeof serverId === 'string' && clientId !== serverId) {
    idMap.set(clientId, serverId);
  }
}
