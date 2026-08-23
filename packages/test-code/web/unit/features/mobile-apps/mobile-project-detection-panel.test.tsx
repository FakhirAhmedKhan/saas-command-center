// @vitest-environment jsdom
import { MobileProjectDetectionPanel } from '@/features/mobile-apps/mobile-project-detection-panel';

import { detectMobileProject, updateMobileApp } from '@/features/mobile-apps/mobile-apps-api';

import { render, screen, waitFor } from '@testing-library/react';

import userEvent from '@testing-library/user-event';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/mobile-apps/mobile-apps-api', () => ({
  detectMobileProject: vi.fn(),

  updateMobileApp: vi.fn(),
}));

const mockedDetect = vi.mocked(detectMobileProject);

const mockedUpdate = vi.mocked(updateMobileApp);

const mobileApp = {
  id: 'mobile-1',

  applicationId: 'application-1',

  platform: 'ANDROID',

  framework: 'ANDROID_NATIVE',

  packageId: null,

  bundleId: null,

  minOsVersion: null,

  targetOsVersion: null,

  currentVersion: null,

  currentBuildNumber: null,

  createdAt: new Date().toISOString(),

  updatedAt: new Date().toISOString(),

  application: {
    id: 'application-1',

    workspaceId: 'workspace-1',

    name: 'Detection App',

    slug: 'detection-app',

    type: 'MOBILE',

    archivedAt: null,

    createdAt: new Date().toISOString(),

    updatedAt: new Date().toISOString(),
  },
} as const;

describe('MobileProjectDetectionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedDetect.mockResolvedValue({
      repository: {
        id: 'repository-1',

        fullName: 'command-center/android-app',

        defaultBranch: 'main',
      },

      mobileDetected: true,

      primaryProject: {
        applicationType: 'MOBILE',

        projectRoot: '.',

        platform: 'ANDROID',

        framework: 'ANDROID_NATIVE',

        packageId: 'com.example.android',

        bundleId: null,

        minOsVersion: '26',

        targetOsVersion: '36',

        currentVersion: '6.14.0',

        currentBuildNumber: '815',

        buildSystem: 'GRADLE',

        confidence: 'HIGH',

        evidence: ['settings.gradle.kts', 'app/build.gradle.kts', 'app/src/main/AndroidManifest.xml'],

        warnings: [],
      },

      projects: [
        {
          applicationType: 'MOBILE',

          projectRoot: '.',

          platform: 'ANDROID',

          framework: 'ANDROID_NATIVE',

          packageId: 'com.example.android',

          bundleId: null,

          minOsVersion: '26',

          targetOsVersion: '36',

          currentVersion: '6.14.0',

          currentBuildNumber: '815',

          buildSystem: 'GRADLE',

          confidence: 'HIGH',

          evidence: ['settings.gradle.kts', 'app/build.gradle.kts', 'app/src/main/AndroidManifest.xml'],

          warnings: [],
        },
      ],

      truncated: false,

      warnings: [],
    });

    mockedUpdate.mockResolvedValue(mobileApp as never);
  });

  it('shows detected Android metadata', async () => {
    const user = userEvent.setup();

    render(<MobileProjectDetectionPanel workspaceId='workspace-1' mobileApp={mobileApp} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Analyze Repository',
      }),
    );

    expect(await screen.findByDisplayValue('com.example.android')).toBeInTheDocument();

    expect(screen.getByDisplayValue('26')).toBeInTheDocument();

    expect(screen.getByDisplayValue('36')).toBeInTheDocument();

    expect(screen.getByDisplayValue('6.14.0')).toBeInTheDocument();

    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('applies detected configuration', async () => {
    const user = userEvent.setup();

    const applied = vi.fn();

    render(<MobileProjectDetectionPanel workspaceId='workspace-1' mobileApp={mobileApp} onApplied={applied} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Analyze Repository',
      }),
    );

    await screen.findByDisplayValue('com.example.android');

    await user.click(
      screen.getByRole('button', {
        name: 'Use Detected Configuration',
      }),
    );

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith(
        'workspace-1',
        'mobile-1',
        expect.objectContaining({
          platform: 'ANDROID',

          framework: 'ANDROID_NATIVE',

          packageId: 'com.example.android',

          minOsVersion: '26',

          targetOsVersion: '36',

          currentVersion: '6.14.0',

          currentBuildNumber: '815',
        }),
      );
    });

    expect(applied).toHaveBeenCalled();
  });
});
