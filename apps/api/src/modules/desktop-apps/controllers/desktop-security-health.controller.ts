import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { DesktopDependencyHealthService } from '../services/desktop-dependency-health.service';
import { DesktopSecurityService } from '../services/desktop-security.service';
import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Dependency and Security Health')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(
    JwtAuthGuard,
    WorkspaceAccessGuard,
    WorkspaceRolesGuard,
)
export class DesktopSecurityHealthController {
    constructor(
        private readonly dependencies: DesktopDependencyHealthService,
        private readonly security: DesktopSecurityService,
    ) { }

    @Get('dependencies')
    listDependencies(
        @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
        @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    ) {
        return this.dependencies.list(workspaceId, desktopAppId);
    }

    @Post('dependencies/scan')
    @WorkspaceRoles(
        WorkspaceRole.OWNER,
        WorkspaceRole.ADMIN,
        WorkspaceRole.DEVELOPER,
    )
    scanDependencies(
        @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
        @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    ) {
        return this.dependencies.scan(workspaceId, desktopAppId);
    }

    @Get('security')
    getSecurity(
        @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
        @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    ) {
        return this.security.get(workspaceId, desktopAppId);
    }

    @Post('security/scan')
    @WorkspaceRoles(
        WorkspaceRole.OWNER,
        WorkspaceRole.ADMIN,
        WorkspaceRole.DEVELOPER,
    )
    scanSecurity(
        @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
        @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    ) {
        return this.security.scan(workspaceId, desktopAppId);
    }
}