'use client';

import {
  completeMilestone,
  completeTask,
  createTask,
  deleteMilestone,
  deleteTask,
  moveTask,
  reopenMilestone,
  reopenTask,
  reorderTasks,
  setTaskStatus,
  skipMilestone,
  skipTask,
  updateMilestone,
  updateTask,
} from '../development-api';
import {
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_VARIANTS,
  PRIORITY_LABELS,
  PRIORITY_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANTS,
} from '../development-constants';
import type { ApplicationMilestone, WorkItemPriority } from '../development-types';
import { formatDevelopmentDate, getDevelopmentError, toApiDate } from '../development-utils';
import { Badge , Button , Card, CardContent, CardHeader , Input , Select } from '@command-center/ui';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, RotateCcw, SkipForward, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface MilestoneCardProps {
  workspaceId: string;
  applicationId: string;
  milestone: ApplicationMilestone;
  milestones: ApplicationMilestone[];
  index: number;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onChanged: () => void;
}

export function MilestoneCard({ workspaceId, applicationId, milestone, milestones, index, onMoveUp, onMoveDown, onChanged }: MilestoneCardProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<WorkItemPriority>('MEDIUM');
  const [weight, setWeight] = useState('1');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleCreateTask(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (title.trim().length < 2) {
      setError('Task title must contain at least two characters.');
      return;
    }

    await run(async () => {
      await createTask(workspaceId, applicationId, milestone.id, {
        title: title.trim(),
        priority,
        weight: Number(weight) || 1,
        dueAt: toApiDate(dueAt),
      });

      setTitle('');
      setPriority('MEDIUM');
      setWeight('1');
      setDueAt('');
    });
  }

  async function editMilestone(): Promise<void> {
    const newTitle = window.prompt('Milestone title', milestone.title);

    if (!newTitle) {
      return;
    }

    const weightValue = window.prompt('Milestone weight', String(milestone.weight));

    if (!weightValue) {
      return;
    }

    await run(() =>
      updateMilestone(workspaceId, applicationId, milestone.id, {
        title: newTitle,
        weight: Number(weightValue) || milestone.weight,
      }),
    );
  }

  async function editTask(taskId: string, currentTitle: string, currentWeight: number): Promise<void> {
    const newTitle = window.prompt('Task title', currentTitle);

    if (!newTitle) {
      return;
    }

    const newWeight = window.prompt('Task weight', String(currentWeight));

    if (!newWeight) {
      return;
    }

    await run(() =>
      updateTask(workspaceId, applicationId, taskId, {
        title: newTitle,
        weight: Number(newWeight) || currentWeight,
      }),
    );
  }

  async function reorderTask(taskIndex: number, direction: -1 | 1): Promise<void> {
    const orderedIds = milestone.tasks.map((task) => task.id);

    const targetIndex = taskIndex + direction;

    if (targetIndex < 0 || targetIndex >= orderedIds.length) {
      return;
    }

    const currentTaskId = orderedIds[taskIndex];

    const targetTaskId = orderedIds[targetIndex];

    if (!currentTaskId || !targetTaskId) {
      return;
    }

    orderedIds[taskIndex] = targetTaskId;

    orderedIds[targetIndex] = currentTaskId;

    await run(() => reorderTasks(workspaceId, applicationId, milestone.id, orderedIds));
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-lg font-semibold text-slate-950'>{milestone.title}</h2>

              <Badge variant={MILESTONE_STATUS_VARIANTS[milestone.status]}>{MILESTONE_STATUS_LABELS[milestone.status]}</Badge>

              <Badge variant='slate'>Weight {milestone.weight}</Badge>
            </div>

            <p className='mt-2 text-sm leading-6 text-slate-500'>{milestone.description ?? 'No milestone description.'}</p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button variant='ghost' size='icon' disabled={index === 0} onClick={() => void onMoveUp()}>
              <ArrowUp className='size-4' />
            </Button>

            <Button variant='ghost' size='icon' disabled={index === milestones.length - 1} onClick={() => void onMoveDown()}>
              <ArrowDown className='size-4' />
            </Button>

            <Button variant='outline' onClick={() => void editMilestone()}>
              <Pencil className='size-4' />
              Edit
            </Button>

            {milestone.status === 'COMPLETED' || milestone.status === 'SKIPPED' ? (
              <Button variant='outline' onClick={() => void run(() => reopenMilestone(workspaceId, applicationId, milestone.id))}>
                <RotateCcw className='size-4' />
                Reopen
              </Button>
            ) : (
              <>
                <Button variant='outline' onClick={() => void run(() => completeMilestone(workspaceId, applicationId, milestone.id))}>
                  <Check className='size-4' />
                  Complete
                </Button>

                <Button
                  variant='ghost'
                  onClick={() => {
                    const reason = window.prompt('Why is this milestone being skipped?');

                    if (reason) {
                      void run(() => skipMilestone(workspaceId, applicationId, milestone.id, reason));
                    }
                  }}
                >
                  <SkipForward className='size-4' />
                  Skip
                </Button>
              </>
            )}

            <Button
              variant='ghost'
              size='icon'
              onClick={() => {
                const confirmed = window.confirm(`Delete "${milestone.title}" and all its tasks?`);

                if (confirmed) {
                  void run(() => deleteMilestone(workspaceId, applicationId, milestone.id));
                }
              }}
            >
              <Trash2 className='size-4 text-red-600' />
            </Button>
          </div>
        </div>

        <div className='mt-5'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-slate-500'>Progress</span>
            <strong className='text-slate-900'>{milestone.progressPercent}%</strong>
          </div>

          <div className='mt-2 h-2 overflow-hidden rounded-full bg-slate-100'>
            <div
              className='h-full rounded-full bg-brand-600 transition-all'
              style={{
                width: `${milestone.progressPercent}%`,
              }}
            />
          </div>

          <div className='mt-3 flex flex-wrap gap-4 text-xs text-slate-500'>
            <span>Start: {formatDevelopmentDate(milestone.startsAt)}</span>

            <span>Due: {formatDevelopmentDate(milestone.dueAt)}</span>

            <span>{milestone.tasks.length} tasks</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-5'>
        {error ? <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div> : null}

        {milestone.status !== 'SKIPPED' ? (
          <details className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
            <summary className='cursor-pointer text-sm font-semibold text-slate-800'>Add task</summary>

            <form onSubmit={handleCreateTask} className='mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_100px_170px_auto]'>
              <Input placeholder='Task title' value={title} disabled={saving} onChange={(event) => setTitle(event.target.value)} />

              <Select value={priority} disabled={saving} onChange={(event) => setPriority(event.target.value as WorkItemPriority)}>
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((item) => (
                  <option key={item} value={item}>
                    {PRIORITY_LABELS[item]}
                  </option>
                ))}
              </Select>

              <Input type='number' min={1} max={100} value={weight} disabled={saving} onChange={(event) => setWeight(event.target.value)} />

              <Input type='date' value={dueAt} disabled={saving} onChange={(event) => setDueAt(event.target.value)} />

              <Button type='submit' loading={saving}>
                <Plus className='size-4' />
                Add
              </Button>
            </form>
          </details>
        ) : null}

        {milestone.tasks.length === 0 ? (
          <div className='rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500'>No tasks have been added.</div>
        ) : (
          <div className='divide-y divide-slate-100'>
            {milestone.tasks.map((task, taskIndex) => (
              <article key={task.id} className='flex flex-col gap-4 py-4 first:pt-0 last:pb-0 xl:flex-row xl:items-center'>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='font-semibold text-slate-900'>{task.title}</p>

                    <Badge variant={TASK_STATUS_VARIANTS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>

                    <Badge variant={PRIORITY_VARIANTS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
                  </div>

                  <p className='mt-1 text-xs text-slate-500'>
                    Weight {task.weight} · Due {formatDevelopmentDate(task.dueAt)}
                  </p>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  <Button variant='ghost' size='icon' disabled={taskIndex === 0} onClick={() => void reorderTask(taskIndex, -1)}>
                    <ArrowUp className='size-4' />
                  </Button>

                  <Button variant='ghost' size='icon' disabled={taskIndex === milestone.tasks.length - 1} onClick={() => void reorderTask(taskIndex, 1)}>
                    <ArrowDown className='size-4' />
                  </Button>

                  <Select
                    aria-label={`Move ${task.title}`}
                    value={task.milestoneId}
                    className='min-w-44'
                    onChange={(event) => void run(() => moveTask(workspaceId, applicationId, task.id, event.target.value))}
                  >
                    {milestones
                      .filter((item) => item.status !== 'SKIPPED')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                  </Select>

                  {false ? (
                    <Button variant='outline' onClick={() => void run(() => reopenTask(workspaceId, applicationId, task.id))}>
                      Reopen
                    </Button>
                  ) : (
                    <>
                      <Select
                        aria-label={`Status for ${task.title}`}
                        value={task.status === 'COMPLETED' || task.status === 'SKIPPED' ? 'TODO' : task.status}
                        className='min-w-36'
                        onChange={(event) =>
                          void run(() => setTaskStatus(workspaceId, applicationId, task.id, event.target.value as 'TODO' | 'IN_PROGRESS' | 'BLOCKED'))
                        }
                      >
                        <option value='TODO'>To do</option>
                        <option value='IN_PROGRESS'>In progress</option>
                        <option value='BLOCKED'>Blocked</option>
                      </Select>

                      <Button variant='outline' onClick={() => void run(() => completeTask(workspaceId, applicationId, task.id))}>
                        Complete
                      </Button>

                      <Button
                        variant='ghost'
                        onClick={() => {
                          const reason = window.prompt('Why is this task being skipped?');

                          if (reason) {
                            void run(() => skipTask(workspaceId, applicationId, task.id, reason));
                          }
                        }}
                      >
                        Skip
                      </Button>
                    </>
                  )}

                  <Button variant='ghost' size='icon' onClick={() => void editTask(task.id, task.title, task.weight)}>
                    <Pencil className='size-4' />
                  </Button>

                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => {
                      const confirmed = window.confirm(`Delete "${task.title}"?`);

                      if (confirmed) {
                        void run(() => deleteTask(workspaceId, applicationId, task.id));
                      }
                    }}
                  >
                    <Trash2 className='size-4 text-red-600' />
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
