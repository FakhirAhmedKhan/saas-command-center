'use client';

import { FRAMEWORKS_BY_PLATFORM, isFrameworkAllowed } from './mobile-app-utils';
import { MOBILE_FRAMEWORK_LABELS, MOBILE_PLATFORM_LABELS } from './mobile-app.constants';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { CreateMobileApplicationInput, MobileApplicationDetails, MobileFramework, MobilePlatform } from '@command-center/shared-types';
import { Button, Input } from '@command-center/ui';
import Link from 'next/link';
import { type FormEvent, useMemo, useState } from 'react';

interface MobileAppFormProps {
  mobileApp?: MobileApplicationDetails;

  cancelHref: string;

  submitLabel: string;

  onSubmit(payload: CreateMobileApplicationInput): Promise<void>;
}

export function MobileAppForm({ mobileApp, cancelHref, submitLabel, onSubmit }: MobileAppFormProps) {
  const [name, setName] = useState(mobileApp?.application.name ?? '');

  const [platform, setPlatform] = useState<MobilePlatform>(mobileApp?.platform ?? 'ANDROID');

  const [framework, setFramework] = useState<MobileFramework>(mobileApp?.framework ?? 'ANDROID_NATIVE');

  const [packageId, setPackageId] = useState(mobileApp?.packageId ?? '');

  const [bundleId, setBundleId] = useState(mobileApp?.bundleId ?? '');

  const [minOsVersion, setMinOsVersion] = useState(mobileApp?.minOsVersion ?? '');

  const [targetOsVersion, setTargetOsVersion] = useState(mobileApp?.targetOsVersion ?? '');

  const [currentVersion, setCurrentVersion] = useState(mobileApp?.currentVersion ?? '');

  const [currentBuildNumber, setCurrentBuildNumber] = useState(mobileApp?.currentBuildNumber ?? '');

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const availableFrameworks = useMemo(() => FRAMEWORKS_BY_PLATFORM[platform], [platform]);

  function handlePlatformChange(nextPlatform: MobilePlatform) {
    setPlatform(nextPlatform);

    if (!isFrameworkAllowed(nextPlatform, framework)) {
      setFramework(FRAMEWORKS_BY_PLATFORM[nextPlatform][0] ?? 'OTHER');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      setError('Application name is required.');

      return;
    }

    if (!isFrameworkAllowed(platform, framework)) {
      setError('Invalid framework for selected platform.');

      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: normalizedName,

        platform,

        framework,

        packageId: packageId.trim() || null,

        bundleId: bundleId.trim() || null,

        minOsVersion: minOsVersion.trim() || null,

        targetOsVersion: targetOsVersion.trim() || null,

        currentVersion: currentVersion.trim() || null,

        currentBuildNumber: currentBuildNumber.trim() || null,
      });
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError));

      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {error ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <h2 className='font-semibold text-slate-950'>Application</h2>

        <div className='mt-5 grid gap-5 md:grid-cols-2'>
          <div className='md:col-span-2'>
            <Input label='Application name' value={name} required maxLength={160} onChange={(event) => setName(event.target.value)} />
          </div>

          <label>
            <span className='mb-2 block text-sm font-medium'>Platform</span>

            <select
              aria-label='Platform'
              value={platform}
              onChange={(event) => handlePlatformChange(event.target.value as MobilePlatform)}
              className='h-10 w-full rounded-lg border border-slate-300 px-3'
            >
              {Object.entries(MOBILE_PLATFORM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className='mb-2 block text-sm font-medium'>Framework</span>

            <select
              aria-label='Framework'
              value={framework}
              onChange={(event) => setFramework(event.target.value as MobileFramework)}
              className='h-10 w-full rounded-lg border border-slate-300 px-3'
            >
              {availableFrameworks.map((value) => (
                <option key={value} value={value}>
                  {MOBILE_FRAMEWORK_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <h2 className='font-semibold text-slate-950'>Identifiers</h2>

        <div className='mt-5 grid gap-5 md:grid-cols-2'>
          <Input label='Package ID' value={packageId} placeholder='com.example.app' onChange={(event) => setPackageId(event.target.value)} />

          <Input label='Bundle ID' value={bundleId} placeholder='com.example.ios' onChange={(event) => setBundleId(event.target.value)} />
        </div>
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <h2 className='font-semibold text-slate-950'>Version & OS</h2>

        <div className='mt-5 grid gap-5 md:grid-cols-2'>
          <Input label='Minimum OS version' value={minOsVersion} onChange={(event) => setMinOsVersion(event.target.value)} />

          <Input label='Target OS version' value={targetOsVersion} onChange={(event) => setTargetOsVersion(event.target.value)} />

          <Input label='Current version' value={currentVersion} onChange={(event) => setCurrentVersion(event.target.value)} />

          <Input label='Current build number' value={currentBuildNumber} onChange={(event) => setCurrentBuildNumber(event.target.value)} />
        </div>
      </section>

      <div className='flex justify-end gap-3'>
        <Link href={cancelHref} className='inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium'>
          Cancel
        </Link>

        <Button type='submit' disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
