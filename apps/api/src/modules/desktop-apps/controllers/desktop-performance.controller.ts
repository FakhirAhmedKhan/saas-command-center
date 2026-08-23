import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import {
    DesktopRuntimeQueryDto,
    IngestDesktopRuntimeDto,
} from '../dto/desktop-runtime.dto';
import { DesktopPerformanceService } from '../services/desktop-performance.service';
import { DesktopRuntimeService } from '../services/desktop-runtime.service';
import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Performance')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(
    JwtAuthGuard,
    WorkspaceAccessGuard,
    WorkspaceRolesGuard,
)
export class DesktopPerformanceController {
    constructor(
        private readonly performance: DesktopPerformanceService,
        private readonly runtime: DesktopRuntimeService,
    ) { }

    @Get('performance')
    get(
        @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
        @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
        @Query() query: DesktopRuntimeQueryDto,
    ) {
        return this.performance.get(workspaceId, desktopAppId, query);
    }

    @Post('telemetry/:integrationId/sync')
    @WorkspaceRoles(
        WorkspaceRole.OWNER,
        WorkspaceRole.ADMIN,
        WorkspaceRole.DEVELOPER,
    )
    sync(
        @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
        @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
        @Param('integrationId', ParseUUIDPipe) integrationId: string,
    ) {
        return this.runtime.syncProvider(
            workspaceId,
            desktopAppId,
            integrationId,
        );
    }

    @Post('runtime/ingest')
    @WorkspaceRoles(
        WorkspaceRole.OWNER,
        WorkspaceRole.ADMIN,
        WorkspaceRole.DEVELOPER,
    )
    ingest(
        @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
        @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
        @Body() dto: IngestDesktopRuntimeDto,
    ) {
        return this.runtime.ingestNormalized(
            workspaceId,
            desktopAppId,
            dto,
        );
    }
}