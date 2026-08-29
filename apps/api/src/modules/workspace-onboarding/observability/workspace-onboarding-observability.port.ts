export const WORKSPACE_ONBOARDING_OBSERVABILITY = Symbol('WORKSPACE_ONBOARDING_OBSERVABILITY');

export type GuidedBuilderEvent =
  | 'guided_builder_started'
  | 'guided_builder_question_answered'
  | 'guided_builder_step_back'
  | 'guided_builder_abandoned'
  | 'guided_builder_resumed'
  | 'guided_builder_blueprint_generated'
  | 'guided_builder_blueprint_edited'
  | 'guided_builder_validation_failed'
  | 'guided_builder_creation_started'
  | 'guided_builder_creation_succeeded'
  | 'guided_builder_creation_failed';

export interface GuidedBuilderEventMetadata {
  sessionId: string;
  userId?: string;
  requestId?: string;
  ruleSetVersion?: string;
  generatorProvider?: 'rules' | 'ai';
  applicationTypeCount?: number;
  validationIssueCode?: string;
  durationMs?: number;
  idempotentRetry?: boolean;
}

export interface WorkspaceOnboardingObservabilityPort {
  event(name: GuidedBuilderEvent, metadata: GuidedBuilderEventMetadata): Promise<void>;
  increment(metric: string, labels?: Record<string, string>): void;
  observe(metric: string, value: number, labels?: Record<string, string>): void;
}
