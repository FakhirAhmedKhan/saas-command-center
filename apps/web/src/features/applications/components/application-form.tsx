'use client';

import { useState, type FormEvent } from 'react';

import Link from 'next/link';

import { Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
  APPLICATION_CATEGORIES,
  APPLICATION_PRIORITIES,
  APPLICATION_STATUSES,
  type ApplicationCategory,
  type ApplicationPriority,
  type ApplicationStatus,
  type CreateApplicationPayload,
  type SaasApplication,
} from '../application-types';

import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../application-constants';

import { getErrorMessage, toApiDateValue, toDateInputValue } from '../application-utils';

interface ApplicationFormProps {
  application?: SaasApplication;
  cancelHref: string;
  submitLabel: string;
  onSubmit: (payload: CreateApplicationPayload) => Promise<void>;
}

export function ApplicationForm({
  application,
  cancelHref,
  submitLabel,
  onSubmit,
}: ApplicationFormProps) {
  const [name, setName] = useState(application?.name ?? '');

  const [slug, setSlug] = useState(application?.slug ?? '');

  const [shortDescription, setShortDescription] = useState(application?.shortDescription ?? '');

  const [longDescription, setLongDescription] = useState(application?.longDescription ?? '');

  const [category, setCategory] = useState<ApplicationCategory>(application?.category ?? 'SAAS');

  const [status, setStatus] = useState<ApplicationStatus>(application?.status ?? 'IDEA');

  const [priority, setPriority] = useState<ApplicationPriority>(application?.priority ?? 'MEDIUM');

  const [startedAt, setStartedAt] = useState(toDateInputValue(application?.startedAt));

  const [targetLaunchAt, setTargetLaunchAt] = useState(
    toDateInputValue(application?.targetLaunchAt),
  );

  const [launchedAt, setLaunchedAt] = useState(toDateInputValue(application?.launchedAt));

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      setError('Application name must contain at least two characters.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: normalizedName,
        slug: slug.trim() || undefined,
        shortDescription: shortDescription.trim() || null,
        longDescription: longDescription.trim() || null,
        category,
        status,
        priority,
        startedAt: toApiDateValue(startedAt),
        targetLaunchAt: toApiDateValue(targetLaunchAt),
        launchedAt: toApiDateValue(launchedAt),
      });
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, 'Unable to save application.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-950">Application information</h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Add the main information used to organize and monitor this SaaS application.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              name="name"
              label="Application name"
              placeholder="PriceScout AI"
              value={name}
              required
              onChange={(event) => setName(event.target.value)}
            />

            <Input
              name="slug"
              label="Slug"
              placeholder="pricescout-ai"
              hint="Leave blank to generate it automatically."
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
            />
          </div>

          <Textarea
            name="shortDescription"
            label="Short description"
            placeholder="A short explanation of the application."
            maxLength={280}
            rows={3}
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
          />

          <Textarea
            name="longDescription"
            label="Long description"
            placeholder="Describe the product, target users, goals and current progress."
            rows={7}
            value={longDescription}
            onChange={(event) => setLongDescription(event.target.value)}
          />

          <div className="grid gap-5 md:grid-cols-3">
            <Select
              name="category"
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value as ApplicationCategory)}
            >
              {APPLICATION_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_LABELS[item]}
                </option>
              ))}
            </Select>

            <Select
              name="status"
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
            >
              {APPLICATION_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item]}
                </option>
              ))}
            </Select>

            <Select
              name="priority"
              label="Priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as ApplicationPriority)}
            >
              {APPLICATION_PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {PRIORITY_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Input
              name="startedAt"
              type="date"
              label="Start date"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
            />

            <Input
              name="targetLaunchAt"
              type="date"
              label="Target launch date"
              value={targetLaunchAt}
              onChange={(event) => setTargetLaunchAt(event.target.value)}
            />

            <Input
              name="launchedAt"
              type="date"
              label="Actual launch date"
              value={launchedAt}
              onChange={(event) => setLaunchedAt(event.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap justify-end gap-3">
          <Link
            href={cancelHref}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <Button type="submit" loading={submitting}>
            <Save className="size-4" />
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
