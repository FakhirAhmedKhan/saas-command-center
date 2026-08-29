import { RuleBasedWorkspaceBlueprintGenerator } from 'src/modules/workspace-onboarding/generators/rule-based-workspace-blueprint.generator';
import { WorkspaceRuleEngine } from 'src/modules/workspace-onboarding/rules/rule-engine';

describe('RuleBasedWorkspaceBlueprintGenerator', () => {
  const generator = new RuleBasedWorkspaceBlueprintGenerator(new WorkspaceRuleEngine());

  const answers = {
    productIdea: 'A cross-platform task management product',
    workspaceName: 'TodoFlow',
    productType: 'PRODUCTIVITY_SAAS' as const,
    targetUsers: ['CONSUMERS'],
    applicationTypes: ['WEB', 'MOBILE', 'DESKTOP'] as const,
    coreFeatures: ['TASKS', 'NOTIFICATIONS'],
    authentication: true,
    collaboration: false,
    notifications: ['PUSH'],
    mobilePlatforms: ['ANDROID', 'IOS'] as const,
    desktopPlatforms: ['WINDOWS'] as const,
    repositories: 'CONNECT_LATER' as const,
    environments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const,
    qualityRequirements: ['CI_CD', 'MONITORING', 'SECURITY'] as const,
  };

  it('is deterministic for identical input and rule version', async () => {
    const first = await generator.generate(answers);
    const second = await generator.generate(answers);

    expect(first).toEqual(second);
  });

  it('generates one application for each requested type', async () => {
    const blueprint = await generator.generate(answers);

    expect(blueprint.applications.map(({ type }) => type)).toEqual(['WEB', 'MOBILE', 'DESKTOP']);
  });

  it('adds an explanation for every applied rule', async () => {
    const blueprint = await generator.generate(answers);

    expect(blueprint.recommendations.length).toBeGreaterThan(0);
    expect(blueprint.recommendations.every(({ ruleId, explanation }) => ruleId && explanation)).toBe(true);
  });
});

describe('WorkspaceRuleEngine', () => {
  it('rejects duplicate priorities', () => {
    const engine = new WorkspaceRuleEngine();
    const draft = {
      schemaVersion: 1 as const,
      generator: { provider: 'rules' as const, version: '1.0.0' },
      workspace: {
        name: 'Test',
        slug: 'test',
        description: 'Test product',
        productType: 'OTHER' as const,
      },
      applications: [],
      services: { backend: [], database: [], cache: [], authentication: [] },
      features: [],
      environments: ['DEVELOPMENT' as const],
      engineeringSystems: [],
      recommendations: [],
    };

    expect(() =>
      engine.apply(draft, { answers: {} }, [
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
      ]),
    ).toThrow('Rule priority conflict');
  });
});
