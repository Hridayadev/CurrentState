import { get, set } from 'idb-keyval';

const QUEUE_KEY = 'cs-sync-queue';

export interface QueuedOp {
  id: string;
  op: string;
  payload: unknown;
  createdAt: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyQueueChange(): void {
  for (const l of listeners) l();
}

export function onQueueChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function getQueue(): Promise<QueuedOp[]> {
  if (typeof indexedDB === 'undefined') return [];
  return (await get<QueuedOp[]>(QUEUE_KEY)) ?? [];
}

async function saveQueue(ops: QueuedOp[]): Promise<void> {
  await set(QUEUE_KEY, ops);
  notifyQueueChange();
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueueOp(op: string, payload: unknown): Promise<void> {
  const queue = await getQueue();
  queue.push({ id: randomId(), op, payload, createdAt: new Date().toISOString() });
  await saveQueue(queue);
}

export async function replaceQueue(ops: QueuedOp[]): Promise<void> {
  await saveQueue(ops);
}
