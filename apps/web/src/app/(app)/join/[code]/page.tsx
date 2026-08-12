'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import { useRoom } from '@/hooks/use-data';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

export default function JoinPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code ?? '');
  const { data: room, isLoading } = useRoom();

  const join = useMutation({
    mutationFn: () => api.joinRoom(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room'] });
      queryClient.invalidateQueries({ queryKey: ['partner'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      router.push('/room');
    },
  });

  if (isLoading) {
    return <Shell title="Join a room" loading />;
  }

  if (!room) {
    return (
      <Shell
        icon={<Users className="h-6 w-6" />}
        title="No room to join"
        body="Join an invite from your partner to connect. Rooms hold exactly two people."
        action={
          <Link href="/room">
            <Button>
              <UserPlus className="h-4 w-4" /> Create a room
            </Button>
          </Link>
        }
      />
    );
  }

  const isFull = room.members.filter((m) => m.status === 'ACTIVE').length >= 2;
  const matches = code.toUpperCase() === room.inviteCode;

  if (isFull) {
    return (
      <Shell
        icon={<KeyRound className="h-6 w-6" />}
        title="Room is full"
        body="This room already has its two members. Rooms hold exactly one partner — leave first if you want a fresh start."
        action={
          <Link href="/room">
            <Button variant="outline">Back to room</Button>
          </Link>
        }
      />
    );
  }

  if (!matches) {
    return (
      <Shell
        icon={<KeyRound className="h-6 w-6" />}
        title="Invite code doesn't match"
        body={`The code “${code.toUpperCase()}” doesn't match your current room. Copy the invite from the Room page and try again.`}
        action={
          <Link href="/room">
            <Button variant="outline">Back to room</Button>
          </Link>
        }
      />
    );
  }

  return (
    <Shell
      icon={<KeyRound className="h-6 w-6" />}
      title="Invitation found"
      body={
        <>
          You were invited to this room. Accept to connect with your partner and see each
          other&apos;s current state in real time.
        </>
      }
      action={
        <Button onClick={() => join.mutate()} loading={join.isPending}>
          <UserPlus className="h-4 w-4" /> Join as partner
        </Button>
      }
    >
      {join.isError ? (
        <p className="mt-3 text-sm text-rose-400">{(join.error as Error).message}</p>
      ) : null}
      <div className="mt-6 flex items-center justify-center gap-4">
        {room.members.map((m) => (
          <div key={m.userId} className="flex flex-col items-center gap-1.5">
            <Avatar emoji={m.emojiAvatar} size="lg" />
            <span className="text-xs text-slate-400">{m.displayName}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Shell({
  icon,
  title,
  body,
  action,
  children,
  loading,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div>
      <PageHeader title="Join a room" description="Accepting an invite connects two people — no more, no less." />
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-line bg-ink-panel/80 p-8 text-center shadow-card">
          {loading ? (
            <p className="text-sm text-slate-500">Checking invitation…</p>
          ) : (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                {icon}
              </span>
              <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
              {body ? <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-400">{body}</p> : null}
              {children}
              {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
