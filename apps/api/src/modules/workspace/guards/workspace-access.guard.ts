import type { WorkspaceRequest } from '../interfaces/workspace-request.interface';
import { WorkspaceMembersService } from '../service/workspace-members.service';
import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(private readonly workspaceMembersService: WorkspaceMembersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkspaceRequest>();
    const rawWorkspaceId = (request.params as { workspaceId?: unknown }).workspaceId;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const workspaceId = Array.isArray(rawWorkspaceId) ? rawWorkspaceId.at(0) : rawWorkspaceId;

    if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
      throw new ForbiddenException('Workspace ID is required');
    }

    if (!request.user?.id) {
      throw new ForbiddenException('Authenticated user is required');
    }
    if (typeof workspaceId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
      throw new BadRequestException('Invalid workspace ID');
    }

    const membership = await this.workspaceMembersService.findMembership(workspaceId.trim(), request.user.id);

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    request.workspaceMember = membership;

    return true;
  }
}
