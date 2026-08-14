'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

interface Toast {
  id: string;
  title: string;
  body: string;
}

const TOAST_TTL_MS = 7000;

/** Pops a transient toast whenever a new notification arrives for this user
 *  (partner activity/profile/settings changes), and keeps partner-facing
 *  queries fresh via Supabase realtime. */
export function NotificationToaster() {
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenRef = useRef<Set<string> | null>(null);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.listNotifications,
    refetchInterval: 30_000,
  });

  // Pop toasts for notifications that arrived after this component mounted.
  useEffect(() => {
    if (!notifications?.length) return;
    if (seenRef.current === null) {
      seenRef.current = new Set(notifications.map((n) => n.id));
      return;
    }
    const fresh = notifications.filter((n) => !seenRef.current!.has(n.id));
    if (!fresh.length) return;
    fresh.forEach((n) => seenRef.current!.add(n.id));
    setToasts((prev) => [
      ...prev,
      ...fresh.slice(0, 3).map((n) => ({ id: n.id, title: n.title, body: n.body })),
    ]);
  }, [notifications]);

  // Realtime: refetch notifications + partner data when anything changes.
  useEffect(() => {
    const unsubscribe = api.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['partner'] });
      queryClient.invalidateQueries({ queryKey: ['partner-history'] });
      queryClient.invalidateQueries({ queryKey: ['active-record'] });
      queryClient.invalidateQueries({ queryKey: ['room'] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => setToasts((prev) => prev.filter((p) => p.id !== t.id)), TOAST_TTL_MS),
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setToasts((prev) => prev.filter((p) => p.id !== t.id))}
          className="pointer-events-auto animate-fade-in rounded-2xl border border-line bg-ink-panel p-4 text-left shadow-glow"
        >
          <p className="text-sm font-semibold text-white">{t.title}</p>
          {t.body ? <p className="mt-0.5 text-xs text-slate-400">{t.body}</p> : null}
        </button>
      ))}
    </div>
  );
}
