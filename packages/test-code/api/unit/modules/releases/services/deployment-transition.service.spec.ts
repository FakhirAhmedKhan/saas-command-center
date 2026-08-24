import { BadRequestException } from '@nestjs/common';
import { DeploymentStatus } from 'src/generated/prisma/client';
import { DeploymentTransitionService } from 'src/modules/releases/services/deployment-transition.service';

describe(DeploymentTransitionService.name, () => {
  const service = new DeploymentTransitionService();

  it.each([
    [DeploymentStatus.DRAFT, DeploymentStatus.SCHEDULED],

    [DeploymentStatus.SCHEDULED, DeploymentStatus.IN_PROGRESS],

    [DeploymentStatus.IN_PROGRESS, DeploymentStatus.SUCCESSFUL],

    [DeploymentStatus.IN_PROGRESS, DeploymentStatus.FAILED],

    [DeploymentStatus.SUCCESSFUL, DeploymentStatus.ROLLED_BACK],
  ])('allows %s -> %s', (current, target) => {
    expect(() => service.assertTransition(current, target)).not.toThrow();
  });

  it.each([
    [DeploymentStatus.DRAFT, DeploymentStatus.SUCCESSFUL],

    [DeploymentStatus.SUCCESSFUL, DeploymentStatus.IN_PROGRESS],

    [DeploymentStatus.ROLLED_BACK, DeploymentStatus.DRAFT],
  ])('rejects %s -> %s', (current, target) => {
    expect(() => service.assertTransition(current, target)).toThrow(BadRequestException);
  });
});
