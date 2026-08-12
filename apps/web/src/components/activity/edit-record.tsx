'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import type { ActivityRecord } from '@/types';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { TagPicker } from '@/components/activity/tag-picker';
import { Toggle } from '@/components/ui/toggle';
import { formatClock, toDateKey } from '@/lib/utils';
import { useCategories } from '@/hooks/use-data';

export function EditRecordDialog({
  record,
  onClose,
}: {
  record: ActivityRecord | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (record) {
      setTitle(record.title);
      setDescription(record.description ?? '');
      setTagIds(record.tagIds);
      setPrivacy(record.privacy);
      setStartTime(record.startTime ? formatClock(record.startTime) : '');
      setEndTime(record.endTime ? formatClock(record.endTime) : '');
    }
  }, [record]);

  const save = useMutation({
    mutationFn: async () => {
      const baseStart = record?.startTime ? new Date(record.startTime) : null;
      const baseEnd = record?.endTime ? new Date(record.endTime) : null;
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      if (baseStart) baseStart.setHours(sh, sm, 0, 0);
      if (baseEnd) baseEnd.setHours(eh, em, 0, 0);
      return api.updateRecord(record!.id, {
        title,
        description,
        privacy,
        tagIds,
        startTime: baseStart ? baseStart.toISOString() : undefined,
        endTime: baseEnd ? baseEnd.toISOString() : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['week-trend'] });
      onClose();
    },
  });

  const isToday = record ? toDateKey(new Date(record.startTime ?? '')) === toDateKey(new Date()) : false;
  const category = categories?.find((c) => c.id === record?.categoryId);

  return (
    <Dialog
      open={Boolean(record)}
      onClose={onClose}
      title={`Edit ${category?.icon ?? ''} ${record?.title ?? ''}`}
      description={isToday ? 'Today\u2019s records are editable.' : 'Historical records are immutable.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!isToday}>
            Save changes
          </Button>
        </>
      }
    >
      {record ? (
        <div className="space-y-4">
          {!isToday ? (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              Records from previous days cannot be edited or deleted (BR-042).
            </p>
          ) : null}
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isToday} />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isToday} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Start time">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={!isToday} />
            </Field>
            <Field label="End time">
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!isToday} />
            </Field>
          </div>
          <Field label="Tags">
            <div className={isToday ? '' : 'pointer-events-none opacity-50'}>
              <TagPicker value={tagIds} onChange={setTagIds} />
            </div>
          </Field>
          <Toggle
            checked={privacy === 'PRIVATE'}
            onChange={(checked) => setPrivacy(checked ? 'PRIVATE' : 'PUBLIC')}
            label="Private record"
            description="Hide from partner (owner always sees)."
          />
        </div>
      ) : null}
    </Dialog>
  );
}
