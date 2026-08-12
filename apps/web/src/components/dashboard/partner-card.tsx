'use client';

import { UserPlus } from 'lucide-react';
import Link from 'next/link';
import { usePartner, useRoom } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { ElapsedTimer } from '@/components/activity/live-timer';
import { Avatar } from '@/components/ui/avatar';
import { cn, formatClock } from '@/lib/utils';

export function PartnerCard() {
  const { data: room } = useRoom();
  const { data: partner } = usePartner();

  if (!room || !partner) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-500/30 bg-ink-panel/60 p-5 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-400">
          <UserPlus className="h-5 w-5" />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-slate-200">No partner yet</h3>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
          Create a room and invite one person to see your live state and share theirs.
        </p>
        <Link href="/room" className="mt-4 inline-block">
          <Button size="sm">Connect with a partner</Button>
        </Link>
      </div>
    );
  }

  const hasActivity = Boolean(partner.activity);

  return (
    <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Partner</p>
        <span
          className={cnPulse(hasActivity)}
        >
          <span className={hasActivity ? 'h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400' : 'h-1.5 w-1.5 rounded-full bg-slate-500'} />
          {hasActivity ? 'Active' : 'Idle'}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <span className="relative flex shrink-0">
          <Avatar emoji={partner.emojiAvatar} size="lg" />
          <span
            className={cnDot(hasActivity)}
          />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-white">{partner.displayName}</p>
          {hasActivity && partner.activity ? (
            <>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-300">
                <span>{partner.activity.categoryIcon}</span>
                <span className="truncate font-medium">{partner.activity.title}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                <ElapsedTimer startTime={partner.activity.startTime} /> · started {formatClock(partner.activity.startTime)}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-slate-500">Not currently tracking an activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function cnPulse(active: boolean) {
  return `inline-flex items-center gap-1.5 text-xs font-medium ${active ? 'text-emerald-300' : 'text-slate-500'}`;
}

function cnDot(active: boolean) {
  return cn(`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-panel`, active ? 'bg-emerald-400' : 'bg-slate-500');
}
