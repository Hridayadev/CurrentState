'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import * as api from '@/lib/api';
import { useCategories, useTemplates } from '@/hooks/use-data';
import { cn } from '@/lib/utils';

export function TemplatePicker({
  value,
  onChange,
  maxHeight = 'max-h-72',
}: {
  value: string;
  onChange: (templateId: string) => void;
  maxHeight?: string;
}) {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const { data: templates } = useTemplates();

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  if (!categories?.length) {
    return <p className="text-sm text-slate-500">No categories yet. Create one to start tracking.</p>;
  }

  return (
    <div className={cn('space-y-4 overflow-y-auto pr-1', maxHeight)}>
      {categories.map((category) => {
        const categoryTemplates = templates?.filter((t) => t.categoryId === category.id) ?? [];
        if (categoryTemplates.length === 0) return null;
        return (
          <div key={category.id}>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              <span>{category.icon}</span> {category.name}
              <span className="normal-case text-slate-600">· {categoryTemplates.length}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categoryTemplates.map((t) => {
                const selected = value === t.id;
                return (
                  <span
                    key={t.id}
                    className={cn(
                      'group inline-flex items-center overflow-hidden rounded-full border transition-all',
                      selected
                        ? 'border-cyan-300/70 bg-cyan-400/15 shadow-[0_0_0_2px_rgba(125,211,252,0.2)]'
                        : 'border-slate-500/30 bg-ink-elevated/50 hover:border-slate-400/50',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onChange(t.id)}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium transition-colors',
                        selected ? 'text-cyan-200' : 'text-slate-300 group-hover:text-white',
                      )}
                    >
                      {t.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove.mutate(t.id)}
                      aria-label={`Delete ${t.title}`}
                      title="Delete this activity"
                      className="flex h-full items-center px-1.5 text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
