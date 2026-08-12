'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import * as api from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function NotificationsBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.listNotifications,
    refetchInterval: 30_000,
  });

  const markAll = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unread = notifications?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-ink-elevated/70 text-slate-300 transition-colors hover:border-current/40 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-[#fff]">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2.5rem)] animate-fade-in overflow-hidden rounded-2xl border border-line bg-ink-panel shadow-glow">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-white">Notifications</p>
              {unread > 0 ? (
                <button
                  onClick={() => markAll.mutate()}
                  className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              ) : null}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications?.length ? (
                notifications.slice(0, 12).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'border-b border-line px-4 py-3 last:border-0',
                      !n.readAt ? 'bg-cyan-400/5' : 'opacity-60',
                    )}
                  >
                    <p className="text-sm font-medium text-slate-200">{n.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{n.body}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{timeAgo(n.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-500">You&apos;re all caught up.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
