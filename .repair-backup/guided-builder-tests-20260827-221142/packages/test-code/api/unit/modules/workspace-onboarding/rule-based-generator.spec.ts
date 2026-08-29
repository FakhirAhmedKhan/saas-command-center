import type { WorkspaceBlueprint, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { RuleBasedWorkspaceBlueprintGenerator } from 'src/modules/workspace-onboarding/generators/rule-based-workspace-blueprint.generator';
import { WorkspaceRuleEngine } from 'src/modules/workspace-onboarding/rules/rule-engine';

describe('RuleBasedWorkspaceBlueprintGenerator', () => {
  const generator = new RuleBasedWorkspaceBlueprintGenerator(new WorkspaceRuleEngine());

  const answers: WorkspaceOnboardingAnswers = {
    productIdea: 'A cross-platform task management product',
    workspaceName: 'TodoFlow',
    productType: 'PRODUCTIVITY_SAAS',
    targetUsers: ['CONSUMERS'],
    applicationTypes: ['WEB', 'MOBILE', 'DESKTOP'],
    coreFeatures: ['TASKS', 'NOTIFICATIONS'],
    authentication: true,
    collaboration: false,
    notifications: ['PUSH'],
    mobilePlatforms: ['ANDROID', 'IOS'],
    desktopPlatforms: ['WINDOWS'],
    repositories: 'CONNECT_LATER',
    environments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
    qualityRequirements: ['CI_CD', 'MONITORING', 'SECURITY'],
  };

  it('is deterministic for identical input and rule version', async () => {
    const first = await generator.generate(answers);
    const second = await generator.generate(answers);

    expect(first).toEqual(second);
  });

  it('generates one application for every requested type', async () => {
    const blueprint = await generator.generate(answers);

    expect(blueprint.applications.map(({ type }) => type)).toEqual(['WEB', 'MOBILE', 'DESKTOP']);
  });

  it('preserves valid application technology preferences', async () => {
    const blueprint = await generator.generate({
      ...answers,
      technologyPreference: {
        WEB: ['NEXT_JS', 'TYPESCRIPT'],
        MOBILE: ['FLUTTER'],
        DESKTOP: ['ELECTRON', 'TYPESCRIPT'],
      },
    });

    expect(blueprint.applications.find(({ type }) => type === 'MOBILE')).toMatchObject({
      stack: ['FLUTTER'],
      source: 'USER',
    });

    expect(blueprint.applications.find(({ type }) => type === 'DESKTOP')).toMatchObject({
      stack: ['ELECTRON', 'TYPESCRIPT'],
      source: 'USER',
    });
  });

  it('creates repository placeholders without activating integrations', async () => {
    const blueprint = await generator.generate(answers);

    expect(blueprint.repositories).toHaveLength(3);

    expect(blueprint.repositories.every(({ strategy, placeholderName }) => strategy === 'CONNECT_LATER' && Boolean(placeholderName))).toBe(true);
  });

  it('adds an explanation for every applied rule', async () => {
    const blueprint = await generator.generate(answers);

    expect(blueprint.recommendations.length).toBeGreaterThan(0);

    expect(blueprint.recommendations.every(({ ruleId, explanation }) => Boolean(ruleId) && Boolean(explanation))).toBe(true);
  });
});

describe('WorkspaceRuleEngine', () => {
  it('rejects duplicate priorities', () => {
    const engine = new WorkspaceRuleEngine();

    const draft: WorkspaceBlueprint = {
      schemaVersion: 1,
      generator: {
        provider: 'rules',
        version: '2.0.0',
      },
      workspace: {
        name: 'Test',
        slug: 'test',
        description: 'Test product',
        productType: 'OTHER',
      },
      applications: [],
      services: {
        backend: [],
        database: [],
        cache: [],
        authentication: [],
      },
      features: [],
      environments: ['DEVELOPMENT'],
      engineeringSystems: [],
      recommendations: [],
      repositories: [],
      engineeringConfigurations: [],
    };

    expect(() =>
      engine.apply(
        draft,
        {
          answers: {},
        },
        [
          {
            id: 'one',
            version: '1',
            priority: 10,
            when: () => true,
            apply: () => undefined,
            explanation: 'one',
          },
          {
            id: 'two',
            version: '1',
            priority: 10,
            when: () => true,
            apply: () => undefined,
            explanation: 'two',
          },
        ],
      ),
    ).toThrow('Rule priority conflict');
  });
});
