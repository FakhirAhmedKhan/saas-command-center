import { AiBlueprintProviderClient } from './ai-blueprint-provider.client';
import { AiWorkspaceBlueprintGenerator } from './generators/ai-workspace-blueprint.generator';
import { RuleBasedWorkspaceBlueprintGenerator } from './generators/rule-based-workspace-blueprint.generator';
import { WORKSPACE_BLUEPRINT_GENERATOR, type WorkspaceBlueprintGenerator } from './generators/workspace-blueprint-generator.interface';
import { PrismaRepositoryConnectionAdapter } from './prisma-repository-connection.adapter';
import { PrismaWorkspaceCreationAdapter } from './prisma-workspace-creation.adapter';
import { QuestionFlowService } from './questions/question-flow.service';
import { REPOSITORY_CONNECTION_PORT } from './repository-connection.port';
import { WorkspaceRuleEngine } from './rules/rule-engine';
import { GuidedWorkspaceBuilderEnabledGuard } from './security/guided-workspace-builder-enabled.guard';
import { WorkspaceOnboardingPayloadService } from './security/workspace-onboarding-payload.service';
import { TechnologyCompatibilityService } from './technology-compatibility.service';
import { WorkspaceAiCircuitBreakerService } from './workspace-ai-circuit-breaker.service';
import { WorkspaceBlueprintService } from './workspace-blueprint.service';
import { WORKSPACE_CREATION_PORT } from './workspace-creation.port';
import { WorkspaceOnboardingCleanupService } from './workspace-onboarding-cleanup.service';
import { WorkspaceOnboardingCreationService } from './workspace-onboarding-creation.service';
import { WorkspaceOnboardingFeatureService } from './workspace-onboarding-feature.service';
import { WorkspaceOnboardingPublicController } from './workspace-onboarding-public.controller';
import { WorkspaceOnboardingController } from './workspace-onboarding.controller';
import { WorkspaceOnboardingRepository } from './workspace-onboarding.repository';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';
import { SharedRateLimitModule } from '../../common/rate-limit/shared-rate-limit.module';
import type { TypedConfigService } from '../../config/runtime-config';
import { PostgresAdvisoryLockService } from '../../infrastructure/database/postgres-advisory-lock.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [SharedRateLimitModule, RepositoriesModule],
  controllers: [WorkspaceOnboardingController, WorkspaceOnboardingPublicController],
  providers: [
    WorkspaceOnboardingRepository,
    WorkspaceOnboardingService,
    WorkspaceBlueprintService,
    WorkspaceOnboardingCreationService,
    WorkspaceOnboardingFeatureService,
    WorkspaceOnboardingPayloadService,
    WorkspaceOnboardingCleanupService,
    GuidedWorkspaceBuilderEnabledGuard,
    QuestionFlowService,
    WorkspaceRuleEngine,
    TechnologyCompatibilityService,
    RuleBasedWorkspaceBlueprintGenerator,
    AiWorkspaceBlueprintGenerator,
    AiBlueprintProviderClient,
    WorkspaceAiCircuitBreakerService,
    PostgresAdvisoryLockService,
    PrismaWorkspaceCreationAdapter,
    PrismaRepositoryConnectionAdapter,
    {
      provide: WORKSPACE_CREATION_PORT,
      useExisting: PrismaWorkspaceCreationAdapter,
    },
    {
      provide: REPOSITORY_CONNECTION_PORT,
      useExisting: PrismaRepositoryConnectionAdapter,
    },
    {
      provide: WORKSPACE_BLUEPRINT_GENERATOR,
      inject: [ConfigService, RuleBasedWorkspaceBlueprintGenerator, AiWorkspaceBlueprintGenerator],
      useFactory: (config: TypedConfigService, rules: RuleBasedWorkspaceBlueprintGenerator, ai: AiWorkspaceBlueprintGenerator): WorkspaceBlueprintGenerator => {
        const provider = config.get('WORKSPACE_GENERATOR_PROVIDER', {
          infer: true,
        });

        return provider === 'ai' ? ai : rules;
      },
    },
  ],
  exports: [WorkspaceOnboardingService],
})
export class WorkspaceOnboardingModule {}
