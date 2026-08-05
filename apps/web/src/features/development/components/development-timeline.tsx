import {
    CalendarClock,
} from 'lucide-react';

import {
    Badge,
} from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';

import {
    TASK_STATUS_LABELS,
    TASK_STATUS_VARIANTS,
} from '../development-constants';

import type {
    ApplicationMilestone,
} from '../development-types';

import {
    formatDevelopmentDate,
} from '../development-utils';

interface DevelopmentTimelineProps {
    milestones: ApplicationMilestone[];
}

export function DevelopmentTimeline({
    milestones,
}: DevelopmentTimelineProps) {
    const items =
        milestones
            .flatMap((milestone) => [
                ...(milestone.dueAt
                    ? [
                        {
                            id: `milestone-${milestone.id}`,
                            type: 'Milestone',
                            title:
                                milestone.title,
                            status:
                                milestone.status,
                            date:
                                milestone.dueAt,
                        },
                    ]
                    : []),

                ...milestone.tasks
                    .filter(
                        (task) =>
                            Boolean(task.dueAt),
                    )
                    .map((task) => ({
                        id: `task-${task.id}`,
                        type: 'Task',
                        title: task.title,
                        status: task.status,
                        date: task.dueAt as string,
                    })),
            ])
            .sort(
                (first, second) =>
                    new Date(
                        first.date,
                    ).getTime() -
                    new Date(
                        second.date,
                    ).getTime(),
            );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CalendarClock className="size-5 text-brand-600" />

                    <h2 className="text-lg font-semibold text-slate-950">
                        Development timeline
                    </h2>
                </div>
            </CardHeader>

            <CardContent>
                {items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                        Add milestone or task due
                        dates to build the timeline.
                    </p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {items.map((item) => (
                            <article
                                key={item.id}
                                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                            >
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                    <CalendarClock className="size-4" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-900">
                                        {item.title}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {item.type}
                                    </p>
                                </div>

                                <div className="text-right">
                                    {'TODO' in
                                        TASK_STATUS_LABELS &&
                                        item.type ===
                                        'Task' ? (
                                        <Badge
                                            variant={
                                                TASK_STATUS_VARIANTS[
                                                item.status as keyof typeof TASK_STATUS_VARIANTS
                                                ]
                                            }
                                        >
                                            {
                                                TASK_STATUS_LABELS[
                                                item.status as keyof typeof TASK_STATUS_LABELS
                                                ]
                                            }
                                        </Badge>
                                    ) : null}

                                    <p className="mt-2 text-sm font-medium text-slate-700">
                                        {formatDevelopmentDate(
                                            item.date,
                                        )}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}