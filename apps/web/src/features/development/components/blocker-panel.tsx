'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { AlertTriangle, Check, Plus, RotateCcw, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import { createBlocker, deleteBlocker, reopenBlocker, resolveBlocker } from '../development-api';

import { PRIORITY_LABELS, PRIORITY_VARIANTS } from '../development-constants';

import type { ApplicationBlocker, ApplicationMilestone, WorkItemPriority } from '../development-types';

import { getDevelopmentError } from '../development-utils';

interface BlockerPanelProps {
  workspaceId: string;
  applicationId: string;
  milestones: ApplicationMilestone[];
  blockers: ApplicationBlocker[];
  onChanged: () => void;
}

export function BlockerPanel({ workspaceId, applicationId, milestones, blockers, onChanged }: BlockerPanelProps) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<WorkItemPriority>('HIGH');
  const [milestoneId, setMilestoneId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableTasks = useMemo(() => {
    if (!milestoneId) {
      return milestones.flatMap((milestone) => milestone.tasks);
    }

    return milestones.find((milestone) => milestone.id === milestoneId)?.tasks ?? [];
  }, [milestoneId, milestones]);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setSaving(true);
    setError(null);

    try {
      await action();
      onChanged();
    } catch (actionError: unknown) {
      setError(getDevelopmentError(actionError));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (title.trim().length < 2) {
      setError('Blocker title is required.');
      return;
    }

    await run(async () => {
      await createBlocker(workspaceId, applicationId, {
        title: title.trim(),
        severity,
        milestoneId: milestoneId || null,
        taskId: taskId || null,
      });

      setTitle('');
      setSeverity('HIGH');
      setMilestoneId('');
      setTaskId('');
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertTriangle className="size-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-950">Blockers</h2>

            <p className="mt-1 text-sm text-slate-500">Record problems preventing development from continuing.</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl bg-slate-50 p-4 xl:grid-cols-[minmax(220px,1fr)_140px_220px_220px_auto]">
          <Input placeholder="Blocker title" value={title} disabled={saving} onChange={(event) => setTitle(event.target.value)} />

          <Select value={severity} disabled={saving} onChange={(event) => setSeverity(event.target.value as WorkItemPriority)}>
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((item) => (
              <option key={item} value={item}>
                {PRIORITY_LABELS[item]}
              </option>
            ))}
          </Select>

          <Select
            value={milestoneId}
            disabled={saving}
            onChange={(event) => {
              setMilestoneId(event.target.value);
              setTaskId('');
            }}
          >
            <option value="">Application-level</option>

            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}
              </option>
            ))}
          </Select>

          <Select value={taskId} disabled={saving} onChange={(event) => setTaskId(event.target.value)}>
            <option value="">No specific task</option>

            {availableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </Select>

          <Button type="submit" loading={saving}>
            <Plus className="size-4" />
            Add
          </Button>
        </form>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {blockers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No blockers recorded.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {blockers.map((blocker) => (
              <article key={blocker.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{blocker.title}</p>

                    <Badge variant={blocker.status === 'OPEN' ? 'red' : 'green'}>{blocker.status === 'OPEN' ? 'Open' : 'Resolved'}</Badge>

                    <Badge variant={PRIORITY_VARIANTS[blocker.severity]}>{PRIORITY_LABELS[blocker.severity]}</Badge>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">{blocker.task?.title ?? blocker.milestone?.title ?? 'Application-level blocker'}</p>

                  {blocker.resolution ? (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Resolution: {blocker.resolution}</p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  {blocker.status === 'OPEN' ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const resolution = window.prompt('How was this blocker resolved?');

                        if (resolution) {
                          void run(() => resolveBlocker(workspaceId, applicationId, blocker.id, resolution));
                        }
                      }}
                    >
                      <Check className="size-4" />
                      Resolve
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => void run(() => reopenBlocker(workspaceId, applicationId, blocker.id))}>
                      <RotateCcw className="size-4" />
                      Reopen
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const confirmed = window.confirm(`Delete "${blocker.title}"?`);

                      if (confirmed) {
                        void run(() => deleteBlocker(workspaceId, applicationId, blocker.id));
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
