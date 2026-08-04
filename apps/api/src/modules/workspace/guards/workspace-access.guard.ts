import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { WorkspaceRequest } from '../interfaces/workspace-request.interface';
import { WorkspaceMembersService } from '../service/workspace-members.service';

@Injectable()
export class WorkspaceAccessGuard
  implements CanActivate {
  constructor(
    private readonly workspaceMembersService:
      WorkspaceMembersService,
  ) { }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context
        .switchToHttp()
        .getRequest<WorkspaceRequest>();

    const rawWorkspaceId =
      request.params?.workspaceId;

    const workspaceId =
      Array.isArray(rawWorkspaceId)
        ? rawWorkspaceId.at(0)
        : rawWorkspaceId;

    if (
      typeof workspaceId !== 'string' ||
      workspaceId.trim().length === 0
    ) {
      throw new ForbiddenException(
        'Workspace ID is required',
      );
    }

    if (!request.user?.id) {
      throw new ForbiddenException(
        'Authenticated user is required',
      );
    }

    const membership =
      await this.workspaceMembersService.findMembership(
        workspaceId.trim(),
        request.user.id,
      );

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this workspace',
      );
    }

    request.workspaceMember = membership;

    return true;
  }
}