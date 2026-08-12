'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import * as api from '@/lib/api';
import { useTags } from '@/hooks/use-data';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/misc';
import type { Tag } from '@/types';

export default function TagsPage() {
  const queryClient = useQueryClient();
  const { data: tags, isLoading } = useTags();
  const { data: records } = useQuery({
    queryKey: ['records', 'all'],
    queryFn: () => api.listRecords(),
  });
  const [input, setInput] = useState('');
  const [deleting, setDeleting] = useState<Tag | null>(null);

  const usage = (tagId: string) => records?.filter((r) => r.tagIds.includes(tagId)).length ?? 0;

  const createTag = useMutation({
    mutationFn: (name: string) => api.createTag(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setInput('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteTag(deleting!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setDeleting(null);
    },
  });

  const canCreate = input.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="Tags"
        description="Tags label your activity records and are reusable across any activity. They stay yours even if you leave a room."
      />

      <div className="mb-6 flex gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">#</span>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canCreate) createTag.mutate(input);
            }}
            placeholder="new tag name…"
            className="pl-7"
          />
        </div>
        <Button
          onClick={() => createTag.mutate(input)}
          disabled={!canCreate}
          loading={createTag.isPending}
        >
          <Plus className="h-4 w-4" /> Add tag
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-line bg-ink-panel/80 p-8 text-center text-sm text-slate-500">
          Loading tags…
        </div>
      ) : !tags || tags.length === 0 ? (
        <EmptyState
          icon={<Hash className="h-6 w-6" />}
          title="No tags yet"
          description="Create a tag like “deepwork” or “exam” and attach it to any activity."
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <div
              key={t.id}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-panel/80 py-1.5 pl-3.5 pr-1.5 shadow-card"
            >
              <span className="text-sm font-medium text-cyan-200">#{t.name}</span>
              <span className="text-xs text-slate-500">
                {usage(t.id)} {usage(t.id) === 1 ? 'record' : 'records'}
              </span>
              <button
                onClick={() => setDeleting(t)}
                className="rounded-full p-1 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                aria-label={`Delete ${t.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete tag?"
        description="The tag is removed from every activity that uses it. Your records stay unchanged."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteMutation.mutate()} loading={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          <span className="font-medium text-white">#{deleting?.name}</span> is used by{' '}
          {deleting ? usage(deleting.id) : 0}{' '}
          {deleting && usage(deleting.id) === 1 ? 'record' : 'records'}.
        </p>
      </Dialog>
    </div>
  );
}
