'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import * as api from '@/lib/api';
import type { Category, Classification } from '@/types';
import { useCategories, useTemplates } from '@/hooks/use-data';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/misc';
import { CLASSIFICATION_META, CLASSIFICATION_ORDER } from '@/lib/classification';
import { cn, EMOJI_ICONS } from '@/lib/utils';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useCategories();
  const { data: templates } = useTemplates();

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const templateCount = (id: string) =>
    templates?.filter((t) => t.categoryId === id).length ?? 0;

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCategory(deleting!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setDeleting(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Categories group your activities and carry a productivity classification. They stay yours even if you leave a room."
        actions={
          <Button onClick={() => setCreating(true)}>
            <FolderPlus className="h-4 w-4" /> New category
          </Button>
        }
      />

      {isLoading ? (
        <div className="rounded-2xl border border-line bg-ink-panel/80 p-8 text-center text-sm text-slate-500">
          Loading categories…
        </div>
      ) : !categories || categories.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="h-6 w-6" />}
          title="No categories yet"
          description="Create a category to start organizing your activities."
          action={
            <Button onClick={() => setCreating(true)}>
              <FolderPlus className="h-4 w-4" /> New category
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-ink-panel/80 p-4 shadow-card"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-ink-elevated/70 text-2xl">
                {c.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge classification={c.classification}>{CLASSIFICATION_META[c.classification].label}</Badge>
                  <span className="text-xs text-slate-500">
                    {templateCount(c.id)} {templateCount(c.id) === 1 ? 'activity' : 'activities'}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleting(c)}
                  className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryDialog
        category={editing}
        open={Boolean(editing) || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
      />

      <DeleteCategoryDialog
        category={deleting}
        templateCount={deleting ? templateCount(deleting.id) : 0}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function CategoryDialog({
  category,
  open,
  onClose,
}: {
  category: Category | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? EMOJI_ICONS[0]);
  const [classification, setClassification] = useState<Classification>(
    category?.classification ?? 'PRODUCTIVE',
  );

  const create = useMutation({
    mutationFn: () => api.createCategory({ name, icon, classification }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      onClose();
    },
  });

  const update = useMutation({
    mutationFn: () => api.updateCategory(category!.id, { name, icon, classification }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      onClose();
    },
  });

  const busy = create.isPending || update.isPending;
  const canSave = name.trim().length > 0 && icon.trim().length > 0;

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={category ? 'Edit category' : 'New category'}
      description="A category groups activities and decides their default productivity classification."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => (category ? update.mutate() : create.mutate())}
            disabled={!canSave}
            loading={busy}
          >
            {category ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Study, Work, Exercise"
            autoFocus
          />
        </Field>

        <Field label="Icon" hint="Pick an icon — every category has exactly one.">
          <div className="grid grid-cols-8 gap-1.5">
            {EMOJI_ICONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                className={cn(
                  'flex h-10 items-center justify-center rounded-lg border text-lg transition-colors',
                  icon === e
                    ? 'border-cyan-300/70 bg-cyan-400/10'
                    : 'border-slate-500/25 bg-ink-elevated/50 hover:border-slate-400/40',
                )}
                aria-label={`Choose ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Classification">
          <Select
            value={classification}
            onChange={(e) => setClassification(e.target.value as Classification)}
          >
            {CLASSIFICATION_ORDER.map((c) => (
              <option key={c} value={c}>
                {CLASSIFICATION_META[c].label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  );
}

function DeleteCategoryDialog({
  category,
  templateCount,
  onClose,
  onConfirm,
  loading,
}: {
  category: Category | null;
  templateCount: number;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (!category) return null;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Delete category?"
      description="Deleting a category also deletes its activities and removes them from your history."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-300">
        <span className="font-semibold text-white">
          {category.icon} {category.name}
        </span>{' '}
        is used by {templateCount} {templateCount === 1 ? 'activity' : 'activities'}.
      </p>
    </Dialog>
  );
}
