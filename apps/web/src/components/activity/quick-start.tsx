'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Plus } from 'lucide-react';
import { useState } from 'react';
import * as api from '@/lib/api';
import { useCategories } from '@/hooks/use-data';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Select, Field } from '@/components/ui/input';
import { TemplatePicker } from '@/components/activity/template-picker';
import { cn } from '@/lib/utils';

export function QuickStart({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();

  const [templateId, setTemplateId] = useState('');
  const [mode, setMode] = useState<'STOPWATCH' | 'FIXED_DURATION'>('STOPWATCH');
  const [minutes, setMinutes] = useState(30);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(categories?.[0]?.id ?? '');

  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const start = useMutation({
    mutationFn: () =>
      api.startTimer({
        templateId,
        mode,
        durationMinutes: mode === 'FIXED_DURATION' ? minutes : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-record'] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['week-trend'] });
      onClose();
      setTemplateId('');
      setMode('STOPWATCH');
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

  const canStart = Boolean(templateId) && !start.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Start a timer"
      description="Pick what you're doing. It won't start until you hit Start."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => start.mutate()} disabled={!canStart} loading={start.isPending}>
            <Play className="h-4 w-4 fill-current" /> Start
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Choose activity</p>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200"
          >
            <Plus className="h-3.5 w-3.5" /> {creating ? 'Cancel' : 'New activity'}
          </button>
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
                <div className="flex items-end gap-2">
                  <Field label="Category name" className="flex-1">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Health"
                      autoFocus
                    />
                  </Field>
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
        ) : (
          <TemplatePicker value={templateId} onChange={setTemplateId} maxHeight="max-h-52" />
        )}

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Timer mode</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('STOPWATCH')}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-left transition-all',
                mode === 'STOPWATCH'
                  ? 'border-cyan-300/70 bg-cyan-400/10'
                  : 'border-slate-500/25 bg-ink-elevated/50 hover:border-slate-400/40',
              )}
            >
              <p className={cn('text-sm font-medium', mode === 'STOPWATCH' ? 'text-cyan-200' : 'text-slate-200')}>Stopwatch</p>
              <p className="mt-0.5 text-xs text-slate-500">Runs until you stop it.</p>
            </button>
            <button
              type="button"
              onClick={() => setMode('FIXED_DURATION')}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-left transition-all',
                mode === 'FIXED_DURATION'
                  ? 'border-cyan-300/70 bg-cyan-400/10'
                  : 'border-slate-500/25 bg-ink-elevated/50 hover:border-slate-400/40',
              )}
            >
              <p className={cn('text-sm font-medium', mode === 'FIXED_DURATION' ? 'text-cyan-200' : 'text-slate-200')}>Fixed duration</p>
              <p className="mt-0.5 text-xs text-slate-500">Auto-completes when time is up.</p>
            </button>
          </div>

          {mode === 'FIXED_DURATION' ? (
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={720}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-slate-400">minutes</span>
            </div>
          ) : null}
        </div>

        <p className="rounded-lg bg-slate-500/10 px-3 py-2 text-xs text-slate-400">
          Timers keep running even if the browser disconnects — the server owns the clock.
        </p>
      </div>
    </Dialog>
  );
}
