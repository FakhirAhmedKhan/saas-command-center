import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceOnboardingFeatureService {
  constructor(private readonly config: TypedConfigService) {}

  isEnabled(): boolean {
    return this.config.workspaceOnboarding.enabled;
  }

  publicState() {
    return {
      guidedWorkspaceBuilderEnabled: this.isEnabled(),
    };
  }
}
