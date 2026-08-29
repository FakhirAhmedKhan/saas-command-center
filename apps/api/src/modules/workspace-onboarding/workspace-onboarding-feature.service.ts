import type { TypedConfigService } from '../../config/runtime-config';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceOnboardingFeatureService {
  constructor(
    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  isEnabled(): boolean {
    return this.config.get('GUIDED_WORKSPACE_BUILDER_ENABLED', {
      infer: true,
    });
  }

  publicState() {
    return {
      guidedWorkspaceBuilderEnabled: this.isEnabled(),
    };
  }
}
