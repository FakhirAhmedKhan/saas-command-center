'use client';

import { Check, RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { completeTask, reopenTask, setTaskStatus } from '../development-api';

import { PRIORITY_LABELS, PRIORITY_VARIANTS } from '../development-constants';

import type {
  ApplicationMilestone,
  ApplicationTask,
  ApplicationTaskStatus,
} from '../development-types';

import { formatDevelopmentDate } from '../development-utils';

interface TaskKanbanProps {
  workspaceId: string;
  applicationId: string;
  milestones: ApplicationMilestone[];
  onChanged: () => void;
}

const COLUMNS: Array<{
  status: Exclude<ApplicationTaskStatus, 'SKIPPED'>;
  label: string;
}> = [
  {
    status: 'TODO',
    label: 'To do',
  },
  {
    status: 'IN_PROGRESS',
    label: 'In progress',
  },
  {
    status: 'BLOCKED',
    label: 'Blocked',
  },
  {
    status: 'COMPLETED',
    label: 'Completed',
  },
];

export function TaskKanban({ workspaceId, applicationId, milestones, onChanged }: TaskKanbanProps) {
  const tasks = milestones.flatMap((milestone) =>
    milestone.tasks.map((task) => ({
      ...task,
      milestoneTitle: milestone.title,
    })),
  );

  async function changeStatus(
    task: ApplicationTask,
    status: Exclude<ApplicationTaskStatus, 'SKIPPED'>,
  ): Promise<void> {
    if (status === 'COMPLETED') {
      await completeTask(workspaceId, applicationId, task.id);
    } else if (task.status === 'COMPLETED' || task.status === 'SKIPPED') {
      await reopenTask(workspaceId, applicationId, task.id);

      if (status !== 'TODO') {
        await setTaskStatus(workspaceId, applicationId, task.id, status);
      }
    } else {
      await setTaskStatus(workspaceId, applicationId, task.id, status);
    }

    onChanged();
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-950">Task board</h2>

        <p className="mt-1 text-sm text-slate-500">View work by its current development status.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);

          return (
            <div
              key={column.status}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{column.label}</h3>

                <Badge variant="slate">{columnTasks.length}</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {columnTasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                    No tasks
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <article
                      key={task.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <p className="font-semibold text-slate-900">{task.title}</p>

                      <p className="mt-1 text-xs text-slate-500">{task.milestoneTitle}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={PRIORITY_VARIANTS[task.priority]}>
                          {PRIORITY_LABELS[task.priority]}
                        </Badge>

                        <Badge variant="slate">Weight {task.weight}</Badge>
                      </div>

                      <p className="mt-3 text-xs text-slate-400">
                        Due {formatDevelopmentDate(task.dueAt)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {COLUMNS.filter((target) => target.status !== task.status)
                          .slice(0, 3)
                          .map((target) => (
                            <Button
                              key={target.status}
                              size="sm"
                              variant="ghost"
                              onClick={() => void changeStatus(task, target.status)}
                            >
                              {target.status === 'COMPLETED' ? (
                                <Check className="size-3.5" />
                              ) : (
                                <RotateCcw className="size-3.5" />
                              )}

                              {target.label}
                            </Button>
                          ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
