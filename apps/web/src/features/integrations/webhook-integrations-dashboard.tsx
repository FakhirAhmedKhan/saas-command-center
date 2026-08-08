/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useCallback, useEffect, useState } from 'react';

import type { FormEvent } from 'react';

import { PageError } from '@/components/states/page-error';

import {
  createWebhookEndpoint,
  disableWebhookEndpoint,
  getWebhookDeliveries,
  getWebhookEndpoints,
  rotateWebhookSecret,
  sendWebhookTest,
  updateWebhookEndpoint,
} from './integrations-api';

import type {
  SaveWebhookInput,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventCatalogItem,
  WebhookEventType,
  WebhookListResponse,
} from './integrations.types';
import { ApiError } from 'next/dist/server/api-utils';
import { getErrorMessage } from '../applications/application-utils';
import { EmptyState } from '@/components/ui/empty-state';

interface WebhookIntegrationsDashboardProps {
  workspaceId: string;
}

interface WebhookFormState {
  name: string;

  url: string;

  eventTypes: WebhookEventType[];

  timeoutMs: number;

  maxAttempts: number;

  enabled: boolean;
}

const INITIAL_FORM: WebhookFormState = {
  name: '',

  url: '',

  eventTypes: [],

  timeoutMs: 10_000,

  maxAttempts: 5,

  enabled: true,
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',

    timeStyle: 'short',
  }).format(new Date(value));
}

function deliveryStatusClasses(status: string): string {
  switch (status) {
    case 'SUCCEEDED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';

    case 'PROCESSING':
      return 'bg-blue-50 text-blue-700 border-blue-200';

    case 'PENDING':
    case 'RETRY_SCHEDULED':
      return 'bg-amber-50 text-amber-700 border-amber-200';

    case 'DEAD_LETTERED':
      return 'bg-red-50 text-red-700 border-red-200';

    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function WebhookForm({
  catalog,
  editing,
  submitting,
  onCancel,
  onSave,
}: {
  catalog: WebhookEventCatalogItem[];

  editing: WebhookEndpoint | null;

  submitting: boolean;

  onCancel: () => void;

  onSave: (input: SaveWebhookInput) => Promise<void>;
}) {
  const [form, setForm] = useState<WebhookFormState>(INITIAL_FORM);

  useEffect(() => {
    if (!editing) {
      setForm(INITIAL_FORM);

      return;
    }

    setForm({
      name: editing.name,

      url: editing.url,

      eventTypes: editing.eventTypes,

      timeoutMs: editing.timeoutMs,

      maxAttempts: editing.maxAttempts,

      enabled: editing.enabled,
    });
  }, [editing]);

  function toggleEvent(eventType: WebhookEventType): void {
    setForm((current) => ({
      ...current,

      eventTypes: current.eventTypes.includes(eventType)
        ? current.eventTypes.filter((value) => value !== eventType)
        : [...current.eventTypes, eventType],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    await onSave(form);
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-950">
            {editing ? 'Edit webhook' : 'Create webhook'}
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Webhooks are signed with HMAC SHA-256. Redirects and private network destinations are
            blocked.
          </p>
        </div>

        <button type="button" onClick={onCancel} className="text-sm font-medium text-slate-500">
          Cancel
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-medium">Name</span>

          <input
            required
            maxLength={100}
            value={form.name}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                name: event.target.value,
              }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Production automation"
          />
        </label>

        <label>
          <span className="text-sm font-medium">Endpoint URL</span>

          <input
            required
            type="url"
            value={form.url}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                url: event.target.value,
              }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="https://automation.example.com/webhooks/command-center"
          />
        </label>

        <label>
          <span className="text-sm font-medium">Timeout</span>

          <select
            value={form.timeoutMs}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                timeoutMs: Number(event.target.value),
              }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option value="5000">5 seconds</option>

            <option value="10000">10 seconds</option>

            <option value="15000">15 seconds</option>

            <option value="30000">30 seconds</option>
          </select>
        </label>

        <label>
          <span className="text-sm font-medium">Maximum attempts</span>

          <select
            value={form.maxAttempts}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                maxAttempts: Number(event.target.value),
              }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-slate-950">Event subscriptions</legend>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {catalog.map((event) => (
            <label
              key={event.type}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"
            >
              <input
                type="checkbox"
                checked={form.eventTypes.includes(event.type)}
                onChange={() => {
                  toggleEvent(event.type);
                }}
                className="mt-1"
              />

              <span>
                <span className="block text-sm font-medium text-slate-950">{event.label}</span>

                <span className="mt-1 block text-xs text-slate-500">{event.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(event) => {
            setForm((current) => ({
              ...current,

              enabled: event.target.checked,
            }));
          }}
        />
        Enable webhook
      </label>

      <button
        type="submit"
        disabled={submitting || form.eventTypes.length === 0}
        className="mt-5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Savingâ€¦' : editing ? 'Save changes' : 'Create webhook'}
      </button>
    </form>
  );
}

export function WebhookIntegrationsDashboard({ workspaceId }: WebhookIntegrationsDashboardProps) {
  const [data, setData] = useState<WebhookListResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<unknown>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const [secret, setSecret] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);

  const [editing, setEditing] = useState<WebhookEndpoint | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpoint | null>(null);

  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);

  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const load = useCallback(async () => {
    const controller = new AbortController();

    setLoading(true);

    try {
      const response = await getWebhookEndpoints(workspaceId, controller.signal);

      setData(response);

      setError(null);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setLoading(false);
    }

    return () => {
      controller.abort();
    };
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadDeliveries(endpoint: WebhookEndpoint): Promise<void> {
    setSelectedEndpoint(endpoint);

    setDeliveriesLoading(true);

    try {
      const response = await getWebhookDeliveries(workspaceId, endpoint.id);

      setDeliveries(response.items);
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setDeliveriesLoading(false);
    }
  }

  async function saveWebhook(input: SaveWebhookInput): Promise<void> {
    setSubmitting(true);

    setActionError(null);

    try {
      if (editing) {
        await updateWebhookEndpoint(workspaceId, editing.id, input);
      } else {
        const response = await createWebhookEndpoint(workspaceId, input);

        setSecret(response.secret);
      }

      setShowForm(false);

      setEditing(null);

      await load();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function testWebhook(endpoint: WebhookEndpoint): Promise<void> {
    setActionError(null);

    try {
      await sendWebhookTest(workspaceId, endpoint.id);

      window.setTimeout(() => {
        void loadDeliveries(endpoint);
      }, 1_000);
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    }
  }

  async function toggleWebhook(endpoint: WebhookEndpoint): Promise<void> {
    try {
      if (endpoint.enabled) {
        const confirmed = window.confirm(
          `Disable ${endpoint.name}? New deliveries will stop immediately.`,
        );

        if (!confirmed) {
          return;
        }

        await disableWebhookEndpoint(workspaceId, endpoint.id);
      } else {
        await updateWebhookEndpoint(workspaceId, endpoint.id, {
          enabled: true,
        });
      }

      await load();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    }
  }

  async function rotateSecret(endpoint: WebhookEndpoint): Promise<void> {
    const confirmed = window.confirm(
      'Rotate this webhook secret? The existing secret will stop working immediately.',
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await rotateWebhookSecret(workspaceId, endpoint.id);

      setSecret(response.secret);
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />

        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <PageError
        title="Integrations unavailable"
        message={getErrorMessage(error)}
        requestId={
          error instanceof ApiError
            ? 'requestId' in error && typeof error.requestId === 'string'
              ? error.requestId
              : undefined
            : undefined
        }
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Workspace settings</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">Integrations</h1>

          <p className="mt-2 text-sm text-slate-600">
            Send selected operational events to external systems through signed webhooks.
          </p>
        </div>

        {data.canManage ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null);

              setShowForm(true);
            }}
            className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white"
          >
            Create webhook
          </button>
        ) : null}
      </header>

      {actionError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {actionError}
        </div>
      ) : null}

      {secret ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-950">Save this signing secret</h2>

          <p className="mt-1 text-sm text-amber-800">
            This secret is shown only once. Store it securely before closing this message.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={secret}
              className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-sm"
            />

            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(secret);
              }}
              className="rounded-lg bg-amber-950 px-4 py-2 text-sm font-medium text-white"
            >
              Copy
            </button>

            <button
              type="button"
              onClick={() => {
                setSecret(null);
              }}
              className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-medium"
            >
              I saved it
            </button>
          </div>
        </section>
      ) : null}

      {showForm ? (
        <WebhookForm
          catalog={data.eventCatalog}
          editing={editing}
          submitting={submitting}
          onSave={saveWebhook}
          onCancel={() => {
            setShowForm(false);

            setEditing(null);
          }}
        />
      ) : null}

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="font-semibold text-blue-950">Signature verification</h2>

        <p className="mt-2 text-sm text-blue-800">
          Calculate HMAC SHA-256 from
          <code className="mx-1 rounded bg-blue-100 px-1">timestamp.rawBody</code>
          and compare it to the
          <code className="mx-1 rounded bg-blue-100 px-1">X-Command-Center-Signature</code>
          header.
        </p>

        <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
          {`const signed = timestamp + "." + rawBody;
const digest = createHmac("sha256", secret)
  .update(signed)
  .digest("hex");

const expected = "v1=" + digest;`}
        </pre>
      </section>

      {data.items.length === 0 ? (
        <EmptyState
          title="No integrations configured"
          description="Create a webhook to deliver selected Command Center events to another system."
          icon={undefined}
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {data.items.map((endpoint) => (
            <article
              key={endpoint.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-slate-950">
                      {endpoint.name}
                    </h2>

                    <span
                      className={
                        endpoint.enabled
                          ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
                          : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600'
                      }
                    >
                      {endpoint.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <p title={endpoint.url} className="mt-2 truncate text-sm text-slate-500">
                    {endpoint.url}
                  </p>
                </div>

                {endpoint.latestDelivery ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${deliveryStatusClasses(
                      endpoint.latestDelivery.status,
                    )}`}
                  >
                    {endpoint.latestDelivery.status}
                  </span>
                ) : null}
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Events</dt>

                  <dd className="mt-1 font-semibold">{endpoint.eventTypes.length}</dd>
                </div>

                <div>
                  <dt className="text-slate-500">Deliveries</dt>

                  <dd className="mt-1 font-semibold">{endpoint.deliveryCount}</dd>
                </div>

                <div>
                  <dt className="text-slate-500">Last success</dt>

                  <dd className="mt-1">{formatDateTime(endpoint.lastSuccessAt)}</dd>
                </div>

                <div>
                  <dt className="text-slate-500">Last failure</dt>

                  <dd className="mt-1">{formatDateTime(endpoint.lastFailureAt)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void loadDeliveries(endpoint);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
                >
                  Delivery logs
                </button>

                {data.canManage ? (
                  <>
                    <button
                      type="button"
                      disabled={!endpoint.enabled}
                      onClick={() => {
                        void testWebhook(endpoint);
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      Send test
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditing(endpoint);

                        setShowForm(true);
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void toggleWebhook(endpoint);
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
                    >
                      {endpoint.enabled ? 'Disable' : 'Enable'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void rotateSecret(endpoint);
                      }}
                      className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-800"
                    >
                      Rotate secret
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedEndpoint ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-950">{selectedEndpoint.name} deliveries</h2>

              <p className="mt-1 text-xs text-slate-500">
                Request bodies and signing secrets are not included in these logs.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedEndpoint(null);

                setDeliveries([]);
              }}
              className="text-sm font-medium text-slate-500"
            >
              Close
            </button>
          </div>

          {deliveriesLoading ? (
            <div className="m-5 h-48 animate-pulse rounded-xl bg-slate-200" />
          ) : deliveries.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No webhook deliveries have been recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Event</th>

                    <th className="px-4 py-3">Status</th>

                    <th className="px-4 py-3 text-right">Attempts</th>

                    <th className="px-4 py-3 text-right">HTTP</th>

                    <th className="px-4 py-3 text-right">Duration</th>

                    <th className="px-4 py-3">Failure</th>

                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>

                <tbody>
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="border-b border-slate-100">
                      <td className="px-4 py-4 font-medium">{delivery.event.type}</td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${deliveryStatusClasses(
                            delivery.status,
                          )}`}
                        >
                          {delivery.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        {delivery.attemptCount}/{delivery.maxAttempts}
                      </td>

                      <td className="px-4 py-4 text-right">{delivery.responseStatus ?? 'â€”'}</td>

                      <td className="px-4 py-4 text-right">
                        {delivery.responseDurationMs !== null
                          ? `${delivery.responseDurationMs}ms`
                          : 'â€”'}
                      </td>

                      <td className="max-w-sm px-4 py-4 text-red-700">
                        {delivery.failureReason ?? 'â€”'}
                      </td>

                      <td className="px-4 py-4">{formatDateTime(delivery.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
