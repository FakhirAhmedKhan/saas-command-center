'use client';

import { useEffect, useState, type FormEvent } from 'react';

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Flag,
  ListChecks,
  Plus,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

import {
  applyDevelopmentTemplate,
  createMilestone,
  getDevelopmentSummary,
  getDevelopmentTemplates,
  reorderMilestones,
} from '../development-api';

import type {
  DevelopmentSummary,
  DevelopmentTemplate,
  DevelopmentTemplateType,
} from '../development-types';

import { TEMPLATE_LABELS } from '../development-constants';

import { getDevelopmentError, toApiDate } from '../development-utils';

import { BlockerPanel } from './blocker-panel';
import { DevelopmentTimeline } from './development-timeline';
import { MilestoneCard } from './milestone-card';
import { TaskKanban } from './task-kanban';

interface DevelopmentBoardProps {
  workspaceId: string;
  applicationId: string;
}

export function DevelopmentBoard({ workspaceId, applicationId }: DevelopmentBoardProps) {
  const [summary, setSummary] = useState<DevelopmentSummary | null>(null);

  const [templates, setTemplates] = useState<DevelopmentTemplate[]>([]);

  const [selectedTemplate, setSelectedTemplate] =
    useState<DevelopmentTemplateType>('STANDARD_SAAS');

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  const [milestoneTitle, setMilestoneTitle] = useState('');

  const [milestoneWeight, setMilestoneWeight] = useState('10');

  const [milestoneStart, setMilestoneStart] = useState('');

  const [milestoneDue, setMilestoneDue] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [summaryResponse, templatesResponse] = await Promise.all([
          getDevelopmentSummary(workspaceId, applicationId),
          getDevelopmentTemplates(workspaceId),
        ]);

        if (cancelled) {
          return;
        }

        setSummary(summaryResponse);
        setTemplates(templatesResponse);
        setError(null);
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(getDevelopmentError(loadError, 'Unable to load development status.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, applicationId, reloadKey]);

  function refresh(): void {
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  async function run(action: () => Promise<unknown>): Promise<void> {
    setSaving(true);
    setError(null);

    try {
      await action();
      refresh();
    } catch (actionError: unknown) {
      setError(getDevelopmentError(actionError));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateMilestone(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (milestoneTitle.trim().length < 2) {
      setError('Milestone title must contain at least two characters.');
      return;
    }

    await run(async () => {
      await createMilestone(workspaceId, applicationId, {
        title: milestoneTitle.trim(),
        weight: Number(milestoneWeight) || 1,
        startsAt: toApiDate(milestoneStart),
        dueAt: toApiDate(milestoneDue),
      });

      setMilestoneTitle('');
      setMilestoneWeight('10');
      setMilestoneStart('');
      setMilestoneDue('');
    });
  }

  async function moveMilestone(index: number, direction: -1 | 1): Promise<void> {
    if (!summary) {
      return;
    }

    const orderedIds = summary.milestones.map((milestone) => milestone.id);

    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= orderedIds.length) {
      return;
    }

    const currentId = orderedIds[index];

    const targetId = orderedIds[targetIndex];

    if (!currentId || !targetId) {
      return;
    }

    orderedIds[index] = targetId;

    orderedIds[targetIndex] = currentId;

    await run(() => reorderMilestones(workspaceId, applicationId, orderedIds));
  }

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Spinner />
          Loading development status...
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Unable to load development status
          </h2>

          <p className="mt-2 text-sm text-red-600">{error ?? 'Development data was not found.'}</p>

          <Button className="mt-6" variant="outline" onClick={refresh}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-600">Development status</p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {summary.application.name}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Progress is calculated from applicable weighted tasks and milestones.
            </p>
          </div>

          <div className="min-w-72">
            <div className="flex items-end justify-between">
              <span className="text-sm font-medium text-slate-500">Overall progress</span>

              <strong className="text-4xl font-bold text-slate-950">
                {summary.progress.percentage}%
              </strong>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{
                  width: `${summary.progress.percentage}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {summary.progress.includedMilestones} applicable milestones ·{' '}
              {summary.progress.excludedMilestones} skipped
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={<Flag className="size-5" />}
          label="Milestones"
          value={summary.counts.milestones}
        />

        <Metric
          icon={<ListChecks className="size-5" />}
          label="Tasks"
          value={summary.counts.tasks}
        />

        <Metric
          icon={<CheckCircle2 className="size-5" />}
          label="Completed"
          value={summary.counts.completedTasks}
        />

        <Metric
          icon={<AlertTriangle className="size-5" />}
          label="Blockers"
          value={summary.counts.openBlockers}
        />

        <Metric
          icon={<CalendarClock className="size-5" />}
          label="Overdue"
          value={summary.counts.overdueTasks}
        />
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-950">Development template</h2>

              <p className="mt-1 text-sm text-slate-500">
                Apply a ready-made milestone and task structure.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <Select
              label="Template"
              value={selectedTemplate}
              onChange={(event) =>
                setSelectedTemplate(event.target.value as DevelopmentTemplateType)
              }
            >
              {templates.map((template) => (
                <option key={template.type} value={template.type}>
                  {template.label} · {template.milestoneCount} milestones · {template.taskCount}{' '}
                  tasks
                </option>
              ))}
            </Select>

            <Button
              loading={saving}
              onClick={() => {
                const replace =
                  summary.milestones.length > 0
                    ? window.confirm(
                        'This application already has milestones. Replace all milestones, tasks and blockers?',
                      )
                    : false;

                if (summary.milestones.length === 0 || replace) {
                  void run(() =>
                    applyDevelopmentTemplate(workspaceId, applicationId, selectedTemplate, replace),
                  );
                }
              }}
            >
              <Sparkles className="size-4" />
              Apply template
            </Button>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            {templates.find((template) => template.type === selectedTemplate)?.description}
          </p>

          {summary.application.developmentTemplate ? (
            <Badge className="mt-4" variant="purple">
              Current: {TEMPLATE_LABELS[summary.application.developmentTemplate]}
            </Badge>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-950">Add milestone</h2>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleCreateMilestone}
            className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_120px_180px_180px_auto]"
          >
            <Input
              placeholder="Milestone title"
              value={milestoneTitle}
              disabled={saving}
              onChange={(event) => setMilestoneTitle(event.target.value)}
            />

            <Input
              type="number"
              min={1}
              max={100}
              value={milestoneWeight}
              disabled={saving}
              onChange={(event) => setMilestoneWeight(event.target.value)}
            />

            <Input
              type="date"
              value={milestoneStart}
              disabled={saving}
              onChange={(event) => setMilestoneStart(event.target.value)}
            />

            <Input
              type="date"
              value={milestoneDue}
              disabled={saving}
              onChange={(event) => setMilestoneDue(event.target.value)}
            />

            <Button type="submit" loading={saving}>
              <Plus className="size-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Milestones</h2>

          <p className="mt-1 text-sm text-slate-500">
            Progress recalculates whenever tasks or milestone weights change.
          </p>
        </div>

        {summary.milestones.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Flag className="mx-auto size-8 text-slate-400" />

            <h3 className="mt-4 font-semibold text-slate-900">No milestones yet</h3>

            <p className="mt-2 text-sm text-slate-500">
              Apply a template or create your first milestone.
            </p>
          </div>
        ) : (
          summary.milestones.map((milestone, index) => (
            <MilestoneCard
              key={milestone.id}
              workspaceId={workspaceId}
              applicationId={applicationId}
              milestone={milestone}
              milestones={summary.milestones}
              index={index}
              onMoveUp={() => moveMilestone(index, -1)}
              onMoveDown={() => moveMilestone(index, 1)}
              onChanged={refresh}
            />
          ))
        )}
      </section>

      <TaskKanban
        workspaceId={workspaceId}
        applicationId={applicationId}
        milestones={summary.milestones}
        onChanged={refresh}
      />

      <BlockerPanel
        workspaceId={workspaceId}
        applicationId={applicationId}
        milestones={summary.milestones}
        blockers={summary.blockers}
        onChanged={refresh}
      />

      <DevelopmentTimeline milestones={summary.milestones} />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{label}</p>

            <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          </div>

          <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
