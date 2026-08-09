import {
    Body,
    Controller,
    Param,
    ParseUUIDPipe,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { Request } from 'express';

import { WorkspaceRole } from 'src/generated/prisma/enums';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';

import {
    CompleteGithubCallbackDto,
    CompleteGithubSetupDto,
} from '../dto/repository.dto';

import { RepositoryConnectService } from '../services/repository-connect.service';

interface AuthenticatedRequest extends Request {
    user: {
        id: string;
    };
}

@ApiTags('Repository GitHub Connection')
@ApiBearerAuth('access-token')
@Controller()
export class GithubConnectController {
    constructor(
        private readonly repositoryConnectService: RepositoryConnectService,
    ) { }

    @Post('workspaces/:workspaceId/repositories/github/connect')
    @UseGuards(
        JwtAuthGuard,
        WorkspaceAccessGuard,
        WorkspaceRolesGuard,
    )
    @WorkspaceRoles(
        WorkspaceRole.OWNER,
        WorkspaceRole.ADMIN,
    )
    begin(
        @Param('workspaceId', ParseUUIDPipe)
        workspaceId: string,

        @Req()
        request: AuthenticatedRequest,
    ) {
        return this.repositoryConnectService.begin(
            workspaceId,
            request.user.id,
        );
    }

    @Post('repositories/github/setup')
    @UseGuards(JwtAuthGuard)
    completeSetup(
        @Req()
        request: AuthenticatedRequest,

        @Body()
        dto: CompleteGithubSetupDto,
    ) {
        return this.repositoryConnectService.completeSetup(
            request.user.id,
            dto,
        );
    }

    @Post('repositories/github/callback')
    @UseGuards(JwtAuthGuard)
    completeCallback(
        @Req()
        request: AuthenticatedRequest,

        @Body()
        dto: CompleteGithubCallbackDto,
    ) {
        return this.repositoryConnectService.completeCallback(
            request.user.id,
            dto,
        );
    }
}