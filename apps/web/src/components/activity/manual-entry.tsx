'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import * as api from '@/lib/api';
import { useCategories, useTemplates } from '@/hooks/use-data';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { TagPicker } from '@/components/activity/tag-picker';
import { Toggle } from '@/components/ui/toggle';
import { toDateKey } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-provider';

export function ManualEntry({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const { data: templates } = useTemplates();

  const [templateId, setTemplateId] = useState('');
  const [dateKey, setDateKey] = useState(toDateKey(new Date()));
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [description, setDescription] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState(user?.preferences.defaultPrivacy ?? 'PUBLIC');

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(categories?.[0]?.id ?? '');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const todayKey = toDateKey(new Date());

  const save = useMutation({
    mutationFn: () =>
      api.createManualRecord({ templateId, start, end, dateKey, tagIds, privacy, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['week-trend'] });
      onClose();
      setTemplateId('');
      setTagIds([]);
      setDescription('');
    },
  });

  const createTemplate = useMutation({
    mutationFn: () => api.createTemplate({ categoryId: newCategory, title: newTitle }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setTemplateId(template.id);
      setCreating(false);
      setNewTitle('');
    },
  });

  const createCategory = useMutation({
    mutationFn: () =>
      api.createCategory({ name: newCategoryName, icon: '📁', classification: 'NEUTRAL' }),
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewCategory(category.id);
      setCreatingCategory(false);
      setNewCategoryName('');
    },
  });

  const removeTemplate = useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      if (templateId) setTemplateId('');
    },
  });

  const canSave = Boolean(templateId) && Boolean(start) && Boolean(end);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Log activity manually"
      description="Add a record you already completed. Only today's records are editable later."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={!canSave} loading={save.isPending}>
            Save record
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Date" hint={dateKey === todayKey ? 'Today — editable.' : 'Past days become immutable at midnight.'}>
          <Input type="date" value={dateKey} max={todayKey} onChange={(e) => setDateKey(e.target.value)} />
        </Field>

        <Field label="Activity">
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="" disabled>
              Choose an activity…
            </option>
            {categories?.map((category) => {
              const list = templates?.filter((t) => t.categoryId === category.id) ?? [];
              if (!list.length) return null;
              return (
                <optgroup key={category.id} label={`${category.icon} ${category.name}`}>
                  {list.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200"
          >
            <Plus className="h-3 w-3" /> {creating ? 'Cancel' : 'New activity'}
          </button>
          {templateId ? (
            <button
              type="button"
              onClick={() => removeTemplate.mutate(templateId)}
              className="inline-flex items-center gap-1 text-xs font-medium text-rose-300 hover:text-rose-200"
            >
              <Trash2 className="h-3 w-3" /> Delete this activity
            </button>
          ) : null}
        </div>

        {creating ? (
          <div className="grid gap-3 rounded-xl border border-line bg-ink-elevated/50 p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Title">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Mathematics"
                  autoFocus
                />
              </Field>
              <Field label="Category" className="sm:w-40">
                <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                className="sm:self-end"
                disabled={!newTitle.trim() || !newCategory}
                onClick={() => createTemplate.mutate()}
                loading={createTemplate.isPending}
              >
                Create
              </Button>
            </div>

            <div className="border-t border-line pt-2">
              {creatingCategory ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Field label="Category name" className="flex-1">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Health"
                      autoFocus
                    />
                  </Field>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button
                      size="sm"
                      disabled={!newCategoryName.trim()}
                      onClick={() => createCategory.mutate()}
                      loading={createCategory.isPending}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCreatingCategory(false);
                        setNewCategoryName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingCategory(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-cyan-200"
                >
                  <Plus className="h-3 w-3" /> New category
                </button>
              )}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Start time">
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End time">
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>

        <Field label="Description (visible to partner by default)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note…"
          />
        </Field>

        <Field label="Tags">
          <TagPicker value={tagIds} onChange={setTagIds} />
        </Field>

        <Toggle
          checked={privacy === 'PRIVATE'}
          onChange={(checked) => setPrivacy(checked ? 'PRIVATE' : 'PUBLIC')}
          label="Private record"
          description="Hide this record from your partner."
        />
      </div>
    </Dialog>
  );
}
