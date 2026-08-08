import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '../../../generated/prisma/client';
import { WORKSPACE_ROLES_KEY } from '../decorators/workspace-roles.decorator';
import type { WorkspaceRequest } from '../interfaces/workspace-request.interface';

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(WORKSPACE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<WorkspaceRequest>();

    if (!request.workspaceMember || !requiredRoles.includes(request.workspaceMember.role)) {
      throw new ForbiddenException('Your workspace role does not permit this action');
    }

    return true;
  }
}
