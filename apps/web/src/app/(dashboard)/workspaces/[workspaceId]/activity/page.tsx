'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  useParams,
} from 'next/navigation';

import {
  getErrorMessage,
} from '@/lib/api/api-error';

import {
  getWorkspaceActivities,
} from '@/features/activity/workspace-activity-api';

import type {
  WorkspaceActivity,
} from '@/features/activity/workspace-activity-api';

function humanize(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(
      /_/g,
      ' ',
    )
    .replace(
      /^\w/,
      (
        letter,
      ) =>
        letter.toUpperCase(),
    );
}

export default function WorkspaceActivityPage() {
  const params =
    useParams<{
      workspaceId:
        string;
    }>();

  const [
    activities,
    setActivities,
  ] =
    useState<
      WorkspaceActivity[]
    >([]);

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    entityType,
    setEntityType,
  ] =
    useState('');

  const [
    from,
    setFrom,
  ] =
    useState('');

  const [
    to,
    setTo,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  useEffect(
    () => {
      const controller =
        new AbortController();

      const timer =
        window.setTimeout(
          () => {
            setLoading(true);

            void getWorkspaceActivities(
              params.workspaceId,

              {
                search:
                  search ||
                  undefined,

                entityType:
                  entityType ||
                  undefined,

                from:
                  from
                    ? new Date(
                        `${from}T00:00:00.000Z`,
                      )
                        .toISOString()
                    : undefined,

                to:
                  to
                    ? new Date(
                        `${to}T23:59:59.999Z`,
                      )
                        .toISOString()
                    : undefined,
              },

              controller.signal,
            )
              .then(
                (
                  response,
                ) => {
                  setActivities(
                    response.items,
                  );

                  setError(
                    null,
                  );
                },
              )
              .catch(
                (
                  caughtError,
                ) => {
                  if (
                    !controller
                      .signal
                      .aborted
                  ) {
                    setError(
                      getErrorMessage(
                        caughtError,
                      ),
                    );
                  }
                },
              )
              .finally(
                () => {
                  if (
                    !controller
                      .signal
                      .aborted
                  ) {
                    setLoading(
                      false,
                    );
                  }
                },
              );
          },

          300,
        );

      return () => {
        controller.abort();

        window.clearTimeout(
          timer,
        );
      };
    },
    [
      params.workspaceId,
      search,
      entityType,
      from,
      to,
    ],
  );

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-950">
          Workspace activity
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Search who changed what and
          when.
        </p>
      </header>

      <section className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label>
          <span className="text-xs font-medium uppercase text-slate-500">
            Search
          </span>

          <input
            value={search}
            onChange={(
              event,
            ) => {
              setSearch(
                event.target
                  .value,
              );
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label>
          <span className="text-xs font-medium uppercase text-slate-500">
            Resource
          </span>

          <select
            value={
              entityType
            }
            onChange={(
              event,
            ) => {
              setEntityType(
                event.target
                  .value,
              );
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option value="">
              All resources
            </option>

            <option value="APPLICATION">
              Application
            </option>

            <option value="WEBSITE">
              Website
            </option>

            <option value="MILESTONE">
              Milestone
            </option>

            <option value="TASK">
              Task
            </option>

            <option value="BLOCKER">
              Blocker
            </option>

            <option value="DEPLOYMENT">
              Deployment
            </option>
          </select>
        </label>

        <label>
          <span className="text-xs font-medium uppercase text-slate-500">
            From
          </span>

          <input
            type="date"
            value={from}
            onChange={(
              event,
            ) => {
              setFrom(
                event.target
                  .value,
              );
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label>
          <span className="text-xs font-medium uppercase text-slate-500">
            To
          </span>

          <input
            type="date"
            value={to}
            onChange={(
              event,
            ) => {
              setTo(
                event.target
                  .value,
              );
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </section>

      {error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 h-72 animate-pulse rounded-2xl bg-slate-200" />
      ) : activities.length ===
        0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          No activity matched these
          filters.
        </div>
      ) : (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {activities.map(
            (
              activity,
            ) => (
              <article
                key={
                  activity.id
                }
                className="border-b border-slate-100 p-5 last:border-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {humanize(
                        activity.activityType,
                      )}
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {
                        activity.description
                      }
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {activity.actorUser
                        ?.name ??
                        activity.actorUser
                          ?.email ??
                        humanize(
                          activity.actorType,
                        )}
                      {activity.application
                        ? ` · ${activity.application.name}`
                        : ''}
                    </p>
                  </div>

                  <time className="text-xs text-slate-500">
                    {new Intl
                      .DateTimeFormat(
                        'en-US',
                        {
                          dateStyle:
                            'medium',

                          timeStyle:
                            'short',
                        },
                      )
                      .format(
                        new Date(
                          activity.createdAt,
                        ),
                      )}
                  </time>
                </div>
              </article>
            ),
          )}
        </section>
      )}
    </div>
  );
}