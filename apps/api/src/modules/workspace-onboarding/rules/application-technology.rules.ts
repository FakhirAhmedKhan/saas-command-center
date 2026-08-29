import type { WorkspaceRule } from './rule-engine';
import type { WorkspaceBlueprintApplication, WorkspacePlatform, WorkspaceTechnology } from '@command-center/shared-types';

function preferred(values: WorkspaceTechnology[] | undefined, fallback: WorkspaceTechnology[]) {
  return values?.length ? [...values] : fallback;
}

function upsert(applications: WorkspaceBlueprintApplication[], application: WorkspaceBlueprintApplication) {
  const index = applications.findIndex(({ type }) => type === application.type);

  if (index === -1) {
    applications.push(application);
  } else {
    applications[index] = application;
  }
}

export const applicationTechnologyRules: readonly WorkspaceRule[] = [
  {
    id: 'web-application-stack',
    version: '2.0.0',
    priority: 110,
    when: ({ answers }) => answers.applicationTypes?.includes('WEB') === true,
    apply: (draft, { answers }) => {
      const preference = answers.technologyPreference?.WEB;
      upsert(draft.applications, {
        type: 'WEB',
        name: `${draft.workspace.name} Web`,
        platforms: ['WEB'],
        stack: preferred(preference, ['NEXT_JS', 'TYPESCRIPT']),
        source: preference?.length ? 'USER' : 'RULE',
      });
    },
    explanation: 'Creates the supported web stack while preserving valid user preferences.',
  },
  {
    id: 'mobile-application-stack',
    version: '2.0.0',
    priority: 210,
    when: ({ answers }) => answers.applicationTypes?.includes('MOBILE') === true,
    apply: (draft, { answers }) => {
      const platforms: WorkspacePlatform[] = answers.mobilePlatforms?.length ? [...answers.mobilePlatforms] : ['ANDROID', 'IOS'];
      const preference = answers.technologyPreference?.MOBILE;
      const defaults: WorkspaceTechnology[] = [...(platforms.includes('ANDROID') ? (['KOTLIN', 'JETPACK_COMPOSE'] as const) : []), ...(platforms.includes('IOS') ? (['SWIFT', 'SWIFTUI'] as const) : [])];

      upsert(draft.applications, {
        type: 'MOBILE',
        name: `${draft.workspace.name} Mobile`,
        platforms: [...platforms],
        stack: preferred(preference, defaults),
        source: preference?.length ? 'USER' : 'RULE',
      });
    },
    explanation: 'Builds a native or explicitly selected mobile stack for the requested platforms.',
  },
  {
    id: 'desktop-application-stack',
    version: '2.0.0',
    priority: 310,
    when: ({ answers }) => answers.applicationTypes?.includes('DESKTOP') === true,
    apply: (draft, { answers }) => {
      const preference = answers.technologyPreference?.DESKTOP;
      upsert(draft.applications, {
        type: 'DESKTOP',
        name: `${draft.workspace.name} Desktop`,
        platforms: answers.desktopPlatforms?.length ? [...answers.desktopPlatforms] : ['WINDOWS'],
        stack: preferred(preference, ['TAURI', 'TYPESCRIPT']),
        source: preference?.length ? 'USER' : 'RULE',
      });
    },
    explanation: 'Creates a supported desktop stack while preserving valid user preferences.',
  },
];
