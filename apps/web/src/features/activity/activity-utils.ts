import type { ApplicationActivity } from './activity-types';

export function formatActivityDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatRelativeActivityDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const difference = date.getTime() - Date.now();

  const absoluteDifference = Math.abs(difference);

  const formatter = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
  });

  if (absoluteDifference < 60_000) {
    return 'just now';
  }

  if (absoluteDifference < 3_600_000) {
    return formatter.format(Math.round(difference / 60_000), 'minute');
  }

  if (absoluteDifference < 86_400_000) {
    return formatter.format(Math.round(difference / 3_600_000), 'hour');
  }

  if (absoluteDifference < 2_592_000_000) {
    return formatter.format(Math.round(difference / 86_400_000), 'day');
  }

  return formatActivityDate(value);
}

export function getActivityActorName(activity: ApplicationActivity): string {
  if (activity.actorType === 'SYSTEM') {
    return 'System';
  }

  return activity.actor?.displayName ?? activity.actor?.email ?? 'Former user';
}

export function getMetadataSummary(activity: ApplicationActivity): string | null {
  const metadata = activity.metadata;

  if (!metadata) {
    return null;
  }

  const previousStatus = metadata.previousStatus;

  const currentStatus = metadata.currentStatus;

  if (typeof previousStatus === 'string' && typeof currentStatus === 'string') {
    return `${humanizeValue(previousStatus)} → ${humanizeValue(currentStatus)}`;
  }

  const previousPriority = metadata.previousPriority;

  const currentPriority = metadata.currentPriority;

  if (typeof previousPriority === 'string' && typeof currentPriority === 'string') {
    return `${humanizeValue(previousPriority)} → ${humanizeValue(currentPriority)}`;
  }

  const changedFields = metadata.changedFields;

  if (Array.isArray(changedFields)) {
    const fields = changedFields
      .filter((field): field is string => typeof field === 'string')
      .map(humanizeValue);

    if (fields.length > 0) {
      return `Changed: ${fields.join(', ')}`;
    }
  }

  const technologyName = metadata.technologyName;

  if (typeof technologyName === 'string') {
    return technologyName;
  }

  const linkLabel = metadata.linkLabel;

  if (typeof linkLabel === 'string') {
    return linkLabel;
  }

  return null;
}

function humanizeValue(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getActivityErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to load activity history';
}
