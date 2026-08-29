import { engineeringSystems, workspaceApplicationTypes, workspaceEnvironments, workspacePlatforms, workspaceProductTypes, workspaceTechnologies } from '@command-center/shared-types';
import { z } from 'zod';

const unique = <T>(values: T[]): boolean => new Set(values).size === values.length;
const uniqueArray = <T extends z.ZodTypeAny>(schema: T, maximum: number) => z.array(schema).max(maximum).refine(unique, 'Duplicate values are not allowed');

export const workspaceOnboardingAnswersPatchSchema = z
  .object({
    productIdea: z.string().trim().min(3).max(500).optional(),
    workspaceName: z.string().trim().min(2).max(80).optional(),
    productType: z.enum(workspaceProductTypes).optional(),
    targetUsers: uniqueArray(z.string().trim().min(1).max(80), 20).optional(),
    applicationTypes: uniqueArray(z.enum(workspaceApplicationTypes), 3).optional(),
    coreFeatures: uniqueArray(z.string().trim().min(1).max(80), 30).optional(),
    authentication: z.boolean().optional(),
    collaboration: z.boolean().optional(),
    notifications: uniqueArray(z.string().trim().min(1).max(50), 10).optional(),
    technologyPreference: z.record(z.enum(workspaceApplicationTypes), uniqueArray(z.enum(workspaceTechnologies), 12)).optional(),
    mobilePlatforms: uniqueArray(z.enum(['ANDROID', 'IOS'] as const), 2).optional(),
    desktopPlatforms: uniqueArray(z.enum(['WINDOWS', 'MACOS', 'LINUX'] as const), 3).optional(),
    webPlatforms: uniqueArray(z.enum(['WEB'] as const), 1).optional(),
    repositories: z.enum(['NONE', 'CONNECT_LATER', 'CONNECT_NOW']).optional(),
    environments: uniqueArray(z.enum(workspaceEnvironments), 3).optional(),
    qualityRequirements: uniqueArray(z.enum(engineeringSystems), engineeringSystems.length).optional(),
  })
  .strict();

export const workspaceOnboardingAnswersSchema = workspaceOnboardingAnswersPatchSchema.superRefine((answers, context) => {
  if (answers.mobilePlatforms?.length && !answers.applicationTypes?.includes('MOBILE')) {
    context.addIssue({
      code: 'custom',
      path: ['mobilePlatforms'],
      message: 'Mobile platforms require the MOBILE application type',
    });
  }

  if (answers.desktopPlatforms?.length && !answers.applicationTypes?.includes('DESKTOP')) {
    context.addIssue({
      code: 'custom',
      path: ['desktopPlatforms'],
      message: 'Desktop platforms require the DESKTOP application type',
    });
  }
});

export const completeWorkspaceOnboardingAnswersSchema = workspaceOnboardingAnswersSchema.superRefine((answers, context) => {
  const required = ['productIdea', 'workspaceName', 'productType', 'targetUsers', 'applicationTypes', 'coreFeatures', 'authentication', 'repositories', 'environments', 'qualityRequirements'] as const;

  for (const key of required) {
    const value = answers[key];

    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: 'This answer is required before blueprint generation',
      });
    }
  }
});

const applicationSchema = z
  .object({
    type: z.enum(workspaceApplicationTypes),
    name: z.string().trim().min(2).max(100),
    platforms: uniqueArray(z.enum(workspacePlatforms), workspacePlatforms.length).min(1),
    stack: uniqueArray(z.enum(workspaceTechnologies), 12).min(1),
    source: z.enum(['USER', 'RULE']),
  })
  .strict()
  .superRefine((application, context) => {
    const allowedPlatforms = {
      WEB: ['WEB'],
      MOBILE: ['ANDROID', 'IOS'],
      DESKTOP: ['WINDOWS', 'MACOS', 'LINUX'],
    } as const;

    for (const platform of application.platforms) {
      if (!(allowedPlatforms[application.type] as readonly string[]).includes(platform)) {
        context.addIssue({
          code: 'custom',
          path: ['platforms'],
          message: `${platform} is incompatible with ${application.type}`,
        });
      }
    }

    if (application.stack.includes('JETPACK_COMPOSE') && !application.stack.includes('KOTLIN')) {
      context.addIssue({
        code: 'custom',
        path: ['stack'],
        message: 'JETPACK_COMPOSE requires KOTLIN',
      });
    }

    if (application.stack.includes('SWIFTUI') && !application.stack.includes('SWIFT')) {
      context.addIssue({
        code: 'custom',
        path: ['stack'],
        message: 'SWIFTUI requires SWIFT',
      });
    }
  });
const repositoryBlueprintSchema = z
  .object({
    applicationType: z.enum(workspaceApplicationTypes),
    strategy: z.enum(['NONE', 'CONNECT_LATER', 'CONNECT_NOW']),
    repositoryId: z
      .string()
      .regex(/^[1-9]\d{0,15}$/, 'Repository ID must be a positive GitHub repository ID')
      .optional(),
    placeholderName: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((repository, context) => {
    if (repository.strategy === 'CONNECT_NOW' && !repository.repositoryId) {
      context.addIssue({
        code: 'custom',
        path: ['repositoryId'],
        message: 'CONNECT_NOW requires a verified repository ID',
      });
    }

    if (repository.strategy === 'CONNECT_LATER' && !repository.placeholderName) {
      context.addIssue({
        code: 'custom',
        path: ['placeholderName'],
        message: 'CONNECT_LATER requires a placeholder name',
      });
    }
  });
const engineeringConfigurationSchema = z
  .object({
    system: z.enum(engineeringSystems),
    state: z.enum(['PROPOSED', 'ACTIVE', 'UNAVAILABLE']),
    enabledByDefault: z.boolean(),
    explanation: z.string().trim().min(1).max(500),
  })
  .strict()
  .superRefine((configuration, context) => {
    if (configuration.state !== 'ACTIVE' && configuration.enabledByDefault) {
      context.addIssue({
        code: 'custom',
        path: ['enabledByDefault'],
        message: 'Only verified active configurations may be enabled',
      });
    }
  });

export const workspaceBlueprintSchema = z
  .object({
    schemaVersion: z.literal(1),
    generator: z
      .object({
        provider: z.enum(['rules', 'ai']),
        version: z.string().trim().min(1).max(80),
      })
      .strict(),
    workspace: z
      .object({
        name: z.string().trim().min(2).max(80),
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(80),
        description: z.string().trim().min(3).max(500),
        productType: z.enum(workspaceProductTypes),
      })
      .strict(),
    applications: uniqueArray(applicationSchema, 3)
      .min(1)
      .refine((applications) => unique(applications.map(({ type }) => type)), 'Only one application blueprint per type is allowed'),
    services: z
      .object({
        backend: uniqueArray(z.enum(workspaceTechnologies), 8),
        database: uniqueArray(z.enum(workspaceTechnologies), 4),
        cache: uniqueArray(z.enum(workspaceTechnologies), 4),
        authentication: uniqueArray(z.string().trim().min(1).max(50), 10),
      })
      .strict(),
    features: uniqueArray(z.string().trim().min(1).max(80), 30),
    environments: uniqueArray(z.enum(workspaceEnvironments), 3).min(1),
    engineeringSystems: uniqueArray(z.enum(engineeringSystems), engineeringSystems.length),
    recommendations: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(120),
            ruleId: z.string().trim().min(1).max(120),
            title: z.string().trim().min(1).max(120),
            explanation: z.string().trim().min(1).max(500),
          })
          .strict(),
      )
      .max(100),
    repositories: uniqueArray(repositoryBlueprintSchema, 3),
    engineeringConfigurations: uniqueArray(engineeringConfigurationSchema, engineeringSystems.length).refine(
      (items) => unique(items.map(({ system }) => system)),
      'Only one configuration per engineering system is allowed',
    ),
  })
  .strict();
