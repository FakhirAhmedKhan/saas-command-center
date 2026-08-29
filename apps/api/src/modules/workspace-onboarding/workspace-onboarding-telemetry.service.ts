import { type GuidedBuilderEvent, type GuidedBuilderEventMetadata, type WorkspaceOnboardingObservabilityPort, WORKSPACE_ONBOARDING_OBSERVABILITY } from './observability/workspace-onboarding-observability.port';
import { Inject, Injectable } from '@nestjs/common';

const allowedMetadataKeys = new Set<keyof GuidedBuilderEventMetadata>([
  'sessionId',
  'userId',
  'requestId',
  'ruleSetVersion',
  'generatorProvider',
  'applicationTypeCount',
  'validationIssueCode',
  'durationMs',
  'idempotentRetry',
]);

@Injectable()
export class WorkspaceOnboardingTelemetryService {
  constructor(
    @Inject(WORKSPACE_ONBOARDING_OBSERVABILITY)
    private readonly observability: WorkspaceOnboardingObservabilityPort,
  ) {}

  async event(name: GuidedBuilderEvent, metadata: GuidedBuilderEventMetadata) {
    const sanitized = Object.fromEntries(Object.entries(metadata).filter(([key]) => allowedMetadataKeys.has(key as keyof GuidedBuilderEventMetadata))) as unknown as GuidedBuilderEventMetadata;

    await this.observability.event(name, sanitized);
  }

  generation(durationMs: number, provider: 'rules' | 'ai', succeeded: boolean) {
    const labels = {
      provider,
      result: succeeded ? 'success' : 'failure',
    };

    this.observability.observe('guided_builder_generation_duration_ms', durationMs, labels);

    this.observability.increment('guided_builder_generation_total', labels);
  }
}
