import { WorkspaceOnboardingFeatureService } from './workspace-onboarding-feature.service';
import { Public } from '../auth/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';

@Controller('features')
export class WorkspaceOnboardingPublicController {
  constructor(private readonly feature: WorkspaceOnboardingFeatureService) {}

  @Public()
  @Get('guided-workspace-builder')
  state() {
    return this.feature.publicState();
  }
}
