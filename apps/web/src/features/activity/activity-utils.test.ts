import type { ApplicationActivity } from './activity-types';
import {
  formatActivityDate,
  formatRelativeActivityDate,
  getActivityActorName,
  getActivityErrorMessage,
  getMetadataSummary,
} from './activity-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function buildActivity(overrides: Partial<ApplicationActivity> = {}): ApplicationActivity {
  return {
    id: 'activity-1',
    workspaceId: 'workspace-1',
    applicationId: 'app-1',
    applicationName: 'Command Center',
    actorUserId: 'user-1',
    actorType: 'USER',
    activityType: 'APPLICATION_CREATED',
    entityType: 'APPLICATION',
    entityId: 'app-1',
    title: 'Created the application',
    description: null,
    metadata: null,
    createdAt: '2026-01-15T12:00:00.000Z',
    actor: { id: 'user-1', email: 'dev@example.com', displayName: 'Dev User' },
    application: null,
    ...overrides,
  };
}

describe('formatActivityDate', () => {
  it('returns "Unknown date" for an unparseable value', () => {
    expect(formatActivityDate('not-a-date')).toBe('Unknown date');
  });

  it('formats a valid timestamp', () => {
    expect(formatActivityDate('2026-01-15T12:00:00.000Z')).toMatch(/2026/);
  });
});

describe('formatRelativeActivityDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatRelativeActivityDate('nope')).toBe('');
  });

  it('reports "just now" inside the one-minute window', () => {
    expect(formatRelativeActivityDate('2026-01-15T11:59:45.000Z')).toBe('just now');
  });

  it('reports minutes below the one-hour threshold', () => {
    expect(formatRelativeActivityDate('2026-01-15T11:15:00.000Z')).toBe('45 minutes ago');
  });

  it('reports hours below the one-day threshold', () => {
    expect(formatRelativeActivityDate('2026-01-15T06:00:00.000Z')).toBe('6 hours ago');
  });

  it('reports days below the 30-day threshold', () => {
    expect(formatRelativeActivityDate('2026-01-12T12:00:00.000Z')).toBe('3 days ago');
  });

  it('falls back to an absolute date beyond 30 days', () => {
    expect(formatRelativeActivityDate('2025-01-15T12:00:00.000Z')).toMatch(/2025/);
  });
});

describe('getActivityActorName', () => {
  it('returns "System" for system activity regardless of actor', () => {
    const activity = buildActivity({ actorType: 'SYSTEM' });

    expect(getActivityActorName(activity)).toBe('System');
  });

  it('prefers the actor display name', () => {
    expect(getActivityActorName(buildActivity())).toBe('Dev User');
  });

  it('falls back to the actor email when displayName is null', () => {
    const activity = buildActivity({
      actor: { id: 'user-1', email: 'dev@example.com', displayName: null },
    });

    expect(getActivityActorName(activity)).toBe('dev@example.com');
  });

  it('falls back to "Former user" when there is no actor', () => {
    expect(getActivityActorName(buildActivity({ actor: null }))).toBe('Former user');
  });
});

describe('getMetadataSummary', () => {
  it('returns null when metadata is absent', () => {
    expect(getMetadataSummary(buildActivity({ metadata: null }))).toBeNull();
  });

  it('returns null when metadata holds nothing recognised', () => {
    expect(getMetadataSummary(buildActivity({ metadata: { unrelated: true } }))).toBeNull();
  });

  it('summarises a status transition and humanises the values', () => {
    const activity = buildActivity({
      metadata: { previousStatus: 'IN_DEVELOPMENT', currentStatus: 'LIVE' },
    });

    expect(getMetadataSummary(activity)).toBe('In Development → Live');
  });

  it('summarises a priority transition', () => {
    const activity = buildActivity({
      metadata: { previousPriority: 'LOW', currentPriority: 'CRITICAL' },
    });

    expect(getMetadataSummary(activity)).toBe('Low → Critical');
  });

  it('prefers a status transition over other metadata', () => {
    const activity = buildActivity({
      metadata: {
        previousStatus: 'IDEA',
        currentStatus: 'PLANNING',
        technologyName: 'Postgres',
      },
    });

    expect(getMetadataSummary(activity)).toBe('Idea → Planning');
  });

  it('lists changed fields and splits camelCase names', () => {
    const activity = buildActivity({
      metadata: { changedFields: ['name', 'targetLaunchAt'] },
    });

    expect(getMetadataSummary(activity)).toBe('Changed: Name, Target Launch At');
  });

  it('ignores non-string entries in changedFields', () => {
    const activity = buildActivity({
      metadata: { changedFields: ['name', 42, null] },
    });

    expect(getMetadataSummary(activity)).toBe('Changed: Name');
  });

  it('falls through when changedFields is empty', () => {
    const activity = buildActivity({
      metadata: { changedFields: [], technologyName: 'Redis' },
    });

    expect(getMetadataSummary(activity)).toBe('Redis');
  });

  it('returns the technology name when present', () => {
    expect(getMetadataSummary(buildActivity({ metadata: { technologyName: 'Redis' } }))).toBe('Redis');
  });

  it('returns the link label when present', () => {
    expect(getMetadataSummary(buildActivity({ metadata: { linkLabel: 'Production' } }))).toBe('Production');
  });
});

describe('getActivityErrorMessage', () => {
  it('returns the Error message', () => {
    expect(getActivityErrorMessage(new Error('Feed unavailable'))).toBe('Feed unavailable');
  });

  it('falls back for non-Error values', () => {
    expect(getActivityErrorMessage('boom')).toBe('Unable to load activity history');
  });
});
