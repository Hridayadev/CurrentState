'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import * as api from '@/lib/api';
import { useTags } from '@/hooks/use-data';

export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tagIds: string[]) => void;
}) {
  const queryClient = useQueryClient();
  const { data: tags } = useTags();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState(false);

  const createTag = useMutation({
    mutationFn: (name: string) => api.createTag(name),
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      onChange([...value, tag.id]);
    },
  });

  const matched = input.trim()
    ? tags?.filter((t) => t.name.toLowerCase().includes(input.trim().toLowerCase())).slice(0, 5) ?? []
    : [];

  const submitSuggestion = (tagId: string) => {
    if (!value.includes(tagId)) onChange([...value, tagId]);
    setInput('');
    setSuggestions(false);
  };

  const submitCreate = () => {
    const name = input.trim();
    if (!name) return;
    createTag.mutate(name);
    setInput('');
    setSuggestions(false);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {(value ?? []).map((id) => {
          const tag = tags?.find((t) => t.id === id);
          if (!tag) return null;
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full border border-current/25 bg-cyan-400/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-cyan-200"
            >
              #{tag.name}
              <button
                type="button"
                onClick={() => onChange((value ?? []).filter((v) => v !== id))}
                className="rounded-full p-0.5 hover:bg-cyan-400/20"
                aria-label={`Remove ${tag.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <div className="relative inline-flex items-center">
          <span className="text-xs text-slate-500">#</span>
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setSuggestions(true);
            }}
            onFocus={() => setSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions && matched.length > 0) submitSuggestion(matched[0].id);
                else submitCreate();
              }
              if (e.key === 'Backspace' && !input && value.length > 0) {
                onChange(value.slice(0, -1));
              }
            }}
            placeholder="add tag…"
            className="w-24 bg-transparent py-1 text-sm text-slate-200 placeholder:text-slate-600"
          />
          {suggestions && input.trim() ? (
            <div className="absolute left-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-ink-panel shadow-glow">
              {matched.length > 0
                ? matched.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => submitSuggestion(t.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-300 hover:bg-overlay"
                    >
                      <span>#{t.name}</span>
                      {value.includes(t.id) ? <span className="text-xs text-cyan-300">added</span> : null}
                    </button>
                  ))
                : null}
              {!matched.some((t) => t.name.toLowerCase() === input.trim().toLowerCase()) ? (
                <button
                  type="button"
                  onClick={submitCreate}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm text-cyan-300 hover:bg-overlay"
                >
                  <Plus className="h-3.5 w-3.5" /> Create #{input.trim().toLowerCase()}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
