import { BadRequestException, Injectable } from '@nestjs/common';
import { DeploymentStatus } from '../../../generated/prisma/client';

const TRANSITIONS: Record<DeploymentStatus, readonly DeploymentStatus[]> = {
  DRAFT: [DeploymentStatus.SCHEDULED, DeploymentStatus.IN_PROGRESS],

  SCHEDULED: [DeploymentStatus.DRAFT, DeploymentStatus.IN_PROGRESS],

  IN_PROGRESS: [DeploymentStatus.SUCCESSFUL, DeploymentStatus.FAILED],

  SUCCESSFUL: [DeploymentStatus.ROLLED_BACK],

  FAILED: [DeploymentStatus.IN_PROGRESS, DeploymentStatus.ROLLED_BACK],

  ROLLED_BACK: [],
};

@Injectable()
export class DeploymentTransitionService {
  getAllowedTransitions(status: DeploymentStatus): DeploymentStatus[] {
    return [...TRANSITIONS[status]];
  }

  assertTransition(
    current: DeploymentStatus,

    target: DeploymentStatus,
  ): void {
    if (current === target) {
      throw new BadRequestException(`Deployment is already ${target}.`);
    }

    if (!TRANSITIONS[current].includes(target)) {
      throw new BadRequestException(`Deployment cannot transition from ${current} to ${target}.`);
    }
  }
}
