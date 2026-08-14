'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, KeyRound, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import { useRoom } from '@/hooks/use-data';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { friendlyRoomJoinError } from '@/lib/utils';

export default function JoinPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code ?? '');
  const normalized = code.trim().toUpperCase();

  const { data: currentRoom, isLoading: roomLoading } = useRoom();

  const { data: invitedRoom, isLoading: previewLoading } = useQuery({
    queryKey: ['invite-preview', normalized],
    queryFn: () => api.previewRoom(normalized),
    enabled: Boolean(normalized),
    retry: false,
  });

  const join = useMutation({
    mutationFn: () => api.joinRoom(normalized),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room'] });
      queryClient.invalidateQueries({ queryKey: ['partner'] });
      queryClient.invalidateQueries({ queryKey: ['partner-history'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      router.push('/room');
    },
  });

  if (roomLoading || previewLoading) {
    return <Shell title="Join a room" loading />;
  }

  if (!invitedRoom) {
    return (
      <Shell
        icon={<Users className="h-6 w-6" />}
        title="Invite not found"
        body={
          <>
            We couldn&apos;t find a room for the code{" "}
            <span className="font-mono font-semibold text-cyan-200">
              {normalized || '—'}
            </span>
            . Double-check the invite link and try again.
          </>
        }
        action={
          <Link href="/room">
            <Button variant="outline">Back to room</Button>
          </Link>
        }
      />
    );
  }

  const alreadyMember = currentRoom?.id === invitedRoom.id;
  if (alreadyMember) {
    return (
      <Shell
        icon={<Check className="h-6 w-6" />}
        title="You're already in this room"
        body="This invite points to the room you're currently in. Head over to see your partner's live state."
        action={
          <Link href="/room">
            <Button>Go to room</Button>
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
          You were invited to a room. Accept to connect with your partner and see each
          other&apos;s current state in real time.
          {currentRoom ? (
            <> Joining moves you out of your current room — your data always stays yours.</>
          ) : null}
        </>
      }
      action={
        <Button onClick={() => join.mutate()} loading={join.isPending}>
          <UserPlus className="h-4 w-4" /> Join as partner
        </Button>
      }
    >
      {join.isError ? (
        <p className="mt-3 text-sm text-rose-400">{friendlyRoomJoinError(join.error)}</p>
      ) : null}
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
