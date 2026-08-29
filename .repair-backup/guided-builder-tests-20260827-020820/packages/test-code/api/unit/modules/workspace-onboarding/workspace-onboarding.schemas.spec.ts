import { completeWorkspaceOnboardingAnswersSchema, workspaceBlueprintSchema, workspaceOnboardingAnswersSchema } from '@command-center/validation';

describe('workspace onboarding schemas', () => {
  it('rejects duplicate application types', () => {
    const result = workspaceOnboardingAnswersSchema.safeParse({
      applicationTypes: ['WEB', 'WEB'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects mobile platforms without a mobile application', () => {
    const result = workspaceOnboardingAnswersSchema.safeParse({
      applicationTypes: ['WEB'],
      mobilePlatforms: ['ANDROID'],
    });

    expect(result.success).toBe(false);
  });

  it('requires complete answers before generation', () => {
    expect(
      completeWorkspaceOnboardingAnswersSchema.safeParse({
        workspaceName: 'TodoFlow',
      }).success,
    ).toBe(false);
  });

  it('rejects an incompatible application platform', () => {
    const result = workspaceBlueprintSchema.safeParse({
      schemaVersion: 1,
      generator: { provider: 'rules', version: '1.0.0' },
      workspace: {
        name: 'TodoFlow',
        slug: 'todoflow',
        description: 'Task management product',
        productType: 'PRODUCTIVITY_SAAS',
      },
      applications: [
        {
          type: 'WEB',
          name: 'TodoFlow Web',
          platforms: ['ANDROID'],
          stack: ['NEXT_JS'],
        },
      ],
      services: {
        backend: ['NEST_JS'],
        database: ['POSTGRESQL'],
        cache: [],
        authentication: [],
      },
      features: ['TASKS'],
      environments: ['DEVELOPMENT'],
      engineeringSystems: [],
      recommendations: [],
    });

    expect(result.success).toBe(false);
  });
});
