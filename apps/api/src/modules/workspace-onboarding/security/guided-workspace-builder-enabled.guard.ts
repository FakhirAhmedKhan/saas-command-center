import { WorkspaceOnboardingFeatureService } from '../workspace-onboarding-feature.service';
import { type CanActivate, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class GuidedWorkspaceBuilderEnabledGuard implements CanActivate {
  constructor(private readonly feature: WorkspaceOnboardingFeatureService) {}

  canActivate(): true {
    if (!this.feature.isEnabled()) {
      throw new NotFoundException('Resource not found');
    }
    return true;
  }
}
