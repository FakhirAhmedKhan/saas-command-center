'use client';

import { getDesktopFrameworksForPlatform, isDesktopFrameworkAllowed } from './desktop-app-utils';
import { DESKTOP_ARCHITECTURE_LABELS, DESKTOP_FRAMEWORK_LABELS, DESKTOP_PLATFORM_LABELS } from './desktop-app.constants';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type {
  CreateDesktopApplicationInput,
  DesktopApplicationDetails,
  DesktopArchitecture,
  DesktopFramework,
  DesktopPlatform,
} from '@command-center/shared-types';
import { Button, Input } from '@command-center/ui';
import Link from 'next/link';
import { type FormEvent, useMemo, useState } from 'react';

interface DesktopAppFormProps {
  desktopApp?: DesktopApplicationDetails;

  cancelHref: string;

  submitLabel: string;

  onSubmit(payload: CreateDesktopApplicationInput): Promise<void>;
}

const SELECT_CLASS_NAME =
  'mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50';

function optionalText(value: string): string | undefined {
  const normalized = value.trim();

  return normalized || undefined;
}

export function DesktopAppForm({ desktopApp, cancelHref, submitLabel, onSubmit }: DesktopAppFormProps) {
  const [name, setName] = useState(desktopApp?.application.name ?? '');

  const [platform, setPlatform] = useState<DesktopPlatform>(desktopApp?.platform ?? 'CROSS_PLATFORM');

  const [framework, setFramework] = useState<DesktopFramework>(desktopApp?.framework ?? 'ELECTRON');

  const [architecture, setArchitecture] = useState<DesktopArchitecture>(desktopApp?.architecture ?? 'X64');

  const [packageName, setPackageName] = useState(desktopApp?.packageName ?? '');

  const [currentVersion, setCurrentVersion] = useState(desktopApp?.currentVersion ?? '');

  const [currentBuildNumber, setCurrentBuildNumber] = useState(desktopApp?.currentBuildNumber ?? '');

  const [minimumOsVersion, setMinimumOsVersion] = useState(desktopApp?.minimumOsVersion ?? '');

  const [updateChannel, setUpdateChannel] = useState(desktopApp?.updateChannel ?? '');

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const frameworkOptions = useMemo(() => getDesktopFrameworksForPlatform(platform), [platform]);

  function handlePlatformChange(nextPlatform: DesktopPlatform): void {
    setPlatform(nextPlatform);

    if (!isDesktopFrameworkAllowed(nextPlatform, framework)) {
      const [firstFramework] = getDesktopFrameworksForPlatform(nextPlatform);

      if (firstFramework) {
        setFramework(firstFramework);
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const normalizedName = name.trim().replace(/\s+/g, ' ');

    if (normalizedName.length < 2) {
      setError('Application name must contain at least 2 characters.');

      return;
    }

    if (!isDesktopFrameworkAllowed(platform, framework)) {
      setError('The selected framework is not valid for this platform.');

      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: normalizedName,

        platform,

        framework,

        architecture,

        packageName: optionalText(packageName),

        currentVersion: optionalText(currentVersion),

        currentBuildNumber: optionalText(currentBuildNumber),

        minimumOsVersion: optionalText(minimumOsVersion),

        updateChannel: optionalText(updateChannel),
      });
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, 'Unable to save desktop application.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className='space-y-6' onSubmit={handleSubmit}>
      {error ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      <div className='grid gap-5 md:grid-cols-2'>
        <div className='md:col-span-2'>
          <Input
            id='desktopApplicationName'
            label='Application name'
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder='Command Center Desktop'
            minLength={2}
            maxLength={160}
            required
          />
        </div>

        <div>
          <label htmlFor='desktopPlatform' className='text-sm font-medium text-slate-800'>
            Platform
          </label>

          <select
            id='desktopPlatform'
            aria-label='Platform'
            className={SELECT_CLASS_NAME}
            value={platform}
            disabled={submitting}
            onChange={(event) => handlePlatformChange(event.target.value as DesktopPlatform)}
          >
            {Object.entries(DESKTOP_PLATFORM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor='desktopFramework' className='text-sm font-medium text-slate-800'>
            Framework
          </label>

          <select
            id='desktopFramework'
            aria-label='Framework'
            className={SELECT_CLASS_NAME}
            value={framework}
            disabled={submitting}
            onChange={(event) => setFramework(event.target.value as DesktopFramework)}
          >
            {frameworkOptions.map((value) => (
              <option key={value} value={value}>
                {DESKTOP_FRAMEWORK_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor='desktopArchitecture' className='text-sm font-medium text-slate-800'>
            Architecture
          </label>

          <select
            id='desktopArchitecture'
            aria-label='Architecture'
            className={SELECT_CLASS_NAME}
            value={architecture}
            disabled={submitting}
            onChange={(event) => setArchitecture(event.target.value as DesktopArchitecture)}
          >
            {Object.entries(DESKTOP_ARCHITECTURE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Input
          id='desktopPackageName'
          label='Package name'
          value={packageName}
          onChange={(event) => setPackageName(event.target.value)}
          placeholder='com.commandcenter.desktop'
          maxLength={255}
        />

        <Input
          id='desktopMinimumOsVersion'
          label='Minimum OS version'
          value={minimumOsVersion}
          onChange={(event) => setMinimumOsVersion(event.target.value)}
          placeholder='Windows 10 / macOS 12'
          maxLength={64}
        />

        <Input
          id='desktopCurrentVersion'
          label='Current version'
          value={currentVersion}
          onChange={(event) => setCurrentVersion(event.target.value)}
          placeholder='2.4.0'
          maxLength={64}
        />

        <Input
          id='desktopCurrentBuildNumber'
          label='Current build number'
          value={currentBuildNumber}
          onChange={(event) => setCurrentBuildNumber(event.target.value)}
          placeholder='184'
          maxLength={64}
        />

        <Input
          id='desktopUpdateChannel'
          label='Update channel'
          value={updateChannel}
          onChange={(event) => setUpdateChannel(event.target.value)}
          placeholder='stable'
          maxLength={64}
        />
      </div>

      <div className='flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end'>
        <Link
          href={cancelHref}
          className='inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
        >
          Cancel
        </Link>

        <Button type='submit' disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
