import type { WorkspaceRule } from './rule-engine';
import type { EngineeringSystem, WorkspaceBlueprintEngineeringConfiguration } from '@command-center/shared-types';

const explanations: Record<EngineeringSystem, string> = {
  CI_CD: 'Proposes build and deployment automation for selected environments.',
  MONITORING: 'Proposes runtime health monitoring without activating an external provider.',
  ANALYTICS: 'Proposes product analytics without inventing a tracking credential.',
  PERFORMANCE: 'Proposes performance collection for selected application types.',
  ALERTS: 'Proposes alert rules that remain inactive until delivery channels are configured.',
  SECURITY: 'Proposes dependency, signing, and configuration security checks.',
  BACKUPS: 'Proposes database backup policy for production environments.',
};

function proposed(system: EngineeringSystem): WorkspaceBlueprintEngineeringConfiguration {
  return {
    system,
    state: 'PROPOSED',
    enabledByDefault: false,
    explanation: explanations[system],
  };
}

export const engineeringSystemRules: readonly WorkspaceRule[] = [
  {
    id: 'requested-engineering-systems',
    version: '1.0.0',
    priority: 700,
    when: ({ answers }) => (answers.qualityRequirements?.length ?? 0) > 0,
    apply: (draft, { answers }) => {
      draft.engineeringConfigurations = answers.qualityRequirements!.map(proposed);
    },
    explanation: 'Requested engineering systems are stored as proposals until configured and verified.',
  },
  {
    id: 'production-security-baseline',
    version: '1.0.0',
    priority: 710,
    when: ({ answers }) => answers.environments?.includes('PRODUCTION') === true,
    apply: (draft) => {
      for (const system of ['CI_CD', 'MONITORING', 'SECURITY', 'BACKUPS'] as const) {
        if (!draft.engineeringConfigurations.some((item) => item.system === system)) {
          draft.engineeringConfigurations.push(proposed(system));
        }
      }
    },
    explanation: 'Production environments require CI/CD, monitoring, security, and backup proposals.',
  },
];
