'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  Clipboard,
  Clock,
  Copy,
  FileJson,
  FileSpreadsheet,
  Fingerprint,
  Globe,
  KeyRound,
  Link2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import * as api from '@/lib/api';
import { usePartner, usePartnerHistory, useRoom } from '@/hooks/use-data';
import { useAuth } from '@/features/auth/auth-provider';
import type { Room, RoomMember } from '@/types';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { Field, Input } from '@/components/ui/input';
import { ElapsedTimer } from '@/components/activity/live-timer';
import { ClassificationBadge } from '@/components/common/classification-badge';
import { cn, formatClock, formatDuration, timeAgo } from '@/lib/utils';

export default function RoomPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: room, isLoading } = useRoom();
  const { data: partner } = usePartner();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['room'] });
    queryClient.invalidateQueries({ queryKey: ['partner'] });
  };

  const createRoom = useMutation({
    mutationFn: api.createRoom,
    onSuccess: refresh,
  });

  const refreshInvite = useMutation({
    mutationFn: api.refreshInvite,
    onSuccess: refresh,
  });

  const leaveRoom = useMutation({
    mutationFn: api.leaveRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refresh();
    },
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Room" description="A private connection between you and one partner." />
        <div className="rounded-2xl border border-line bg-ink-panel/80 p-8 text-center text-sm text-slate-500">
          Loading your room…
        </div>
      </div>
    );
  }

  if (!room) {
    return <NoRoom onCreate={() => createRoom.mutate()} creating={createRoom.isPending} onJoined={refresh} />;
  }

  const members = room.members.filter((m) => m.status === 'ACTIVE');
  const isFull = members.length >= 2;

  // Partner already joined → the room just shows their full info and an exit.
  if (isFull) {
    return (
      <div>
        <PageHeader
          title="Room"
          description="Your private, two-person space. It grants access — it never owns your data."
          actions={<Badge tone="green">Connected</Badge>}
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <PartnerFullCard />
            <PartnerHistoryCard />
          </div>

          <aside className="space-y-5">
            <LeaveRoomCard onLeave={() => leaveRoom.mutate()} leaving={leaveRoom.isPending} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Room"
        description="Your private, two-person space. It grants access — it never owns your data."
        actions={<Badge tone="amber">Waiting for partner</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <MembersCard members={room.members} meId={user?.id ?? ''} />

          <WaitingPanel
            room={room}
            onJoined={refresh}
            onRefreshInvite={() => refreshInvite.mutate()}
            refreshPending={refreshInvite.isPending}
          />
        </div>

        <aside className="space-y-5">
          <InviteCard room={room} onRefresh={() => refreshInvite.mutate()} refreshPending={refreshInvite.isPending} />
          <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Room rules</p>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                Max two active members — no groups.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                Your categories, activities, and history stay yours.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                Partner access is read-only and privacy-aware.
              </li>
            </ul>
          </div>

          <LeaveRoomCard onLeave={() => leaveRoom.mutate()} leaving={leaveRoom.isPending} />
        </aside>
      </div>
    </div>
  );
}

function NoRoom({
  onCreate,
  creating,
  onJoined,
}: {
  onCreate: () => void;
  creating: boolean;
  onJoined: () => void;
}) {
  const [code, setCode] = useState('');
  const join = useMutation({
    mutationFn: () => api.joinRoom(code),
    onSuccess: () => {
      setCode('');
      onJoined();
    },
  });

  return (
    <div>
      <PageHeader
        title="Room"
        description="A private connection between you and one partner."
      />
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="No room yet"
        description="Create a room and share your invite, or join your partner's room with their code. You can have one active room at a time."
        action={
          <Button onClick={onCreate} loading={creating}>
            <UserPlus className="h-4 w-4" /> Create a room
          </Button>
        }
      />

      <div className="mt-5 rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Join a room</p>
        <p className="mt-1.5 text-sm text-slate-400">
          Have an invite? Enter your partner&apos;s code to connect — rooms hold exactly two people.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="INVITE CODE"
            maxLength={8}
            className="sm:flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') join.mutate();
            }}
          />
          <Button onClick={() => join.mutate()} disabled={!code.trim()} loading={join.isPending}>
            <UserPlus className="h-4 w-4" /> Join room
          </Button>
        </div>
        {join.isError ? (
          <p className="mt-2 text-xs text-rose-400">{(join.error as Error).message}</p>
        ) : null}
      </div>
    </div>
  );
}

function MembersCard({ members, meId }: { members: RoomMember[]; meId: string }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Members</p>
        <span className="text-xs text-slate-500">
          {members.length} / 2
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {members.map((m) => {
          const isMe = m.userId === meId;
          return (
            <div
              key={m.userId}
              className="flex items-center gap-3 rounded-xl border border-line bg-ink-elevated/60 p-4"
            >
              <span className="relative flex shrink-0">
                <Avatar emoji={m.emojiAvatar} size="lg" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-panel bg-emerald-400" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="truncate">{m.displayName}</span>
                  {isMe ? <Badge tone="cyan">You</Badge> : <Badge tone="slate">Partner</Badge>}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Joined {timeAgo(m.joinedAt)}</p>
              </div>
            </div>
          );
        })}
        {members.length === 1 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-500/30 p-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-amber-400" />
              Waiting for your partner…
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PartnerFullCard() {
  const { data: partner } = usePartner();
  if (!partner) return null;
  const hasActivity = Boolean(partner.activity);

  return (
    <div className="rounded-2xl border border-line bg-ink-panel/80 p-6 shadow-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="relative flex shrink-0">
            <Avatar emoji={partner.emojiAvatar} size="xl" />
            <span
              className={cn(
                'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-ink-panel',
                hasActivity ? 'bg-emerald-400' : 'bg-slate-500',
              )}
            />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-white">{partner.displayName}</h2>
              <Badge tone="cyan">Partner</Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-slate-400">{partner.email}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {partner.joinedAt ? `Connected ${timeAgo(partner.joinedAt)}` : 'Connected'}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 text-xs font-medium',
            hasActivity ? 'text-emerald-300' : 'text-slate-500',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', hasActivity ? 'animate-pulse-dot bg-emerald-400' : 'bg-slate-500')} />
          {hasActivity ? 'Active now' : 'Idle'}
        </span>
      </div>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
        <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={partner.email} />
        <InfoItem icon={<Globe className="h-4 w-4" />} label="Timezone" value={partner.timezone} />
        <InfoItem
          icon={<CalendarDays className="h-4 w-4" />}
          label="Member since"
          value={partner.joinedAt ? formatDate(partner.joinedAt) : '—'}
        />
        <InfoItem icon={<Fingerprint className="h-4 w-4" />} label="User ID" value={partner.userId} />
      </dl>

      <div className="mt-5 rounded-xl border border-line bg-ink-elevated/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Current activity</p>
        {hasActivity && partner.activity ? (
          <>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span>{partner.activity.categoryIcon}</span>
              <span className="truncate font-medium text-white">{partner.activity.title}</span>
              <ClassificationBadge classification={partner.activity.classification} />
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              <ElapsedTimer startTime={partner.activity.startTime} /> · started {formatClock(partner.activity.startTime)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Not currently tracking an activity.</p>
        )}
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-ink-elevated/60 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function PartnerHistoryCard() {
  const { data: history, isLoading } = usePartnerHistory();
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null);

  const download = async (format: 'csv' | 'json') => {
    setBusy(format);
    try {
      const res = await api.exportPartnerRecords(format);
      const url = URL.createObjectURL(new Blob([res.content], { type: res.type }));
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Partner&apos;s activity</p>
          <p className="mt-1.5 text-sm text-slate-400">
            Read-only — only what your partner shares publicly. They can change or hide this anytime.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => download('csv')} loading={busy === 'csv'}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => download('json')} loading={busy === 'json'}>
            <FileJson className="h-3.5 w-3.5" /> Export JSON
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Loading partner&apos;s activity…</p>
      ) : !history || history.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No shared activity yet. When your partner tracks something, it will show up here.
        </p>
      ) : (
        <ul className="mt-4 max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-ink-elevated/40">
          {history.slice(0, 50).map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-elevated/80 text-lg">
                {r.categoryIcon || '✨'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-200">{r.title}</p>
                  <ClassificationBadge classification={r.classification} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {r.categoryName || 'General'} · {formatDate(r.startTime!)} · {formatClock(r.startTime!)}–{formatClock(r.endTime!)}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">
                {formatDuration(r.durationSeconds ?? 0, { compact: true })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WaitingPanel({
  room,
  onJoined,
  onRefreshInvite,
  refreshPending,
}: {
  room: Room;
  onJoined: () => void;
  onRefreshInvite: () => void;
  refreshPending: boolean;
}) {
  const [code, setCode] = useState('');
  const join = useMutation({
    mutationFn: () => api.joinRoom(code),
    onSuccess: () => {
      setCode('');
      onJoined();
    },
  });

  return (
    <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Invite your partner</p>
      <p className="mt-1.5 text-sm text-slate-400">
        Share the code or link — your partner signs in and joins from their own account.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Field label="Invite code" className="sm:flex-1">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={room.inviteCode}
            maxLength={8}
            onKeyDown={(e) => {
              if (e.key === 'Enter') join.mutate();
            }}
          />
        </Field>
        <div className="flex items-end gap-2">
          <Button onClick={() => join.mutate()} disabled={!code.trim()} loading={join.isPending}>
            <UserPlus className="h-4 w-4" /> Join as partner
          </Button>
          <Button variant="outline" onClick={onRefreshInvite} loading={refreshPending} title="New invite code">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {join.isError ? (
        <p className="mt-2 text-xs text-rose-400">{(join.error as Error).message}</p>
      ) : null}
    </div>
  );
}

function InviteCard({
  room,
  onRefresh,
  refreshPending,
}: {
  room: Room;
  onRefresh: () => void;
  refreshPending: boolean;
}) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const copy = async (value: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // clipboard unavailable — nothing to do
    }
  };

  const isFull = room.members.filter((m) => m.status === 'ACTIVE').length >= 2;

  return (
    <div className="rounded-2xl border border-line bg-ink-panel/80 p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Invite</p>
        <Button variant="ghost" size="icon-sm" onClick={onRefresh} loading={refreshPending} title="Regenerate invite">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-ink-elevated/60 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
            <KeyRound className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-lg font-semibold tracking-[0.2em] text-cyan-200">{room.inviteCode}</p>
            {room.inviteExpiresAt ? (
              <p className="text-xs text-slate-500">Expires {formatDate(room.inviteExpiresAt)}</p>
            ) : (
              <p className="text-xs text-slate-500">Invite code</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => copy(room.inviteCode, 'code')}>
            {copied === 'code' ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
            {copied === 'code' ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-ink-elevated/60 p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300">
          <Link2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-300">{room.inviteLink}</p>
          <p className="text-xs text-slate-500">Anyone with this link can join</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => copy(room.inviteLink, 'link')}>
          {copied === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === 'link' ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {isFull ? (
        <p className="mt-3 text-center text-xs text-slate-500">
          Your partner has joined. Sharing more invites is optional.
        </p>
      ) : null}
    </div>
  );
}

function LeaveRoomCard({
  onLeave,
  leaving,
}: {
  onLeave: () => void;
  leaving: boolean;
}) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wider text-rose-300">Exit room</p>
      <p className="mt-1.5 text-sm text-slate-400">
        You&apos;ll keep all your personal data, categories, and history. You can create a new room anytime.
      </p>
      {confirm ? (
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" variant="danger" onClick={onLeave} loading={leaving}>
            <LogOut className="h-3.5 w-3.5" /> Confirm exit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="danger" className="mt-4" onClick={() => setConfirm(true)}>
          <LogOut className="h-3.5 w-3.5" /> Exit room
        </Button>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
