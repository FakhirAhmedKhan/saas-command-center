import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import {
    CurrentUser,
} from '../../auth/decorators/current-user.decorator';

import type {
    AuthenticatedUser,
} from '../../auth/interfaces/auth-session.interface';

import {
    JwtAuthGuard,
} from '../../auth/guards/jwt-auth.guard';

import {
    WorkspaceAccessGuard,
} from '../../workspace/guards/workspace-access.guard';

import {
    CreateHealthCheckDto,
    HealthCheckListQueryDto,
    IncidentListQueryDto,
    UpdateHealthCheckDto,
} from '../dto/health-check.dto';

import {
    HealthCheckRunnerService,
} from '../services/health-check-runner.service';

import {
    MonitoringAccessService,
} from '../services/monitoring-access.service';

import {
    MonitoringService,
} from '../services/monitoring.service';

@ApiTags('Monitoring')
@ApiBearerAuth(
    'access-token',
)
@Controller(
    'workspaces/:workspaceId/monitoring',
)
@UseGuards(
    JwtAuthGuard,
    WorkspaceAccessGuard,
)
export class MonitoringController {
    constructor(
        private readonly monitoring:
            MonitoringService,

        private readonly access:
            MonitoringAccessService,

        private readonly runner:
            HealthCheckRunnerService,
    ) { }

    @Get('summary')
    @ApiOperation({
        summary:
            'Get workspace monitoring summary',
    })
    getSummary(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId:
            string,

        @CurrentUser()
        user:
            AuthenticatedUser,
    ) {
        return this.monitoring
            .getSummary(
                workspaceId,
                user.id,
            );
    }

    @Get('targets')
    @ApiOperation({
        summary:
            'List available monitoring targets',
    })
    getTargets(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId:
            string,
    ) {
        return this.monitoring
            .getTargets(
                workspaceId,
            );
    }

    @Get('checks')
    @ApiOperation({
        summary:
            'List workspace health checks',
    })
    listChecks(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId:
            string,

        @Query()
        query:
            HealthCheckListQueryDto,
    ) {
        return this.monitoring
            .list(
                workspaceId,
                query,
            );
    }

    @Post('checks')
    @ApiCreatedResponse()
    @ApiOperation({
        summary:
            'Create a health check',
    })
    createCheck(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId:
            string,

        @CurrentUser()
        user:
            AuthenticatedUser,

        @Body()
        body:
            CreateHealthCheckDto,
    ) {
        return this.monitoring
            .create(
                workspaceId,
                user.id,
                body,
            );
    }

    @Get('checks/:checkId')
    getCheck(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId:
            string,

        @Param(
            'checkId',
            ParseUUIDPipe,
        )
        checkId:
            string,
    ) {
        return this.monitoring
            .getOne(
                workspaceId,
                checkId,
            );
    }

    @Patch('checks/:checkId')
    updateCheck(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId:
            string,

        @Param(
            'checkId',
            ParseUUIDPipe,
        )
        checkId:
            string,

        @CurrentUser()
        user:
            AuthenticatedUser,

        @Body()
        body:
            UpdateHealthCheckDto,
    ) {
        return this.monitoring
            .update(
                workspaceId,
                checkId,
                user.id,
                body,
            );
    }

    @Post(
        'checks/:checkId/run',
    )
    @ApiOperation({
        summary:
            'Run a health check immediately',
    })
    async runCheck(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId:
            string,

        @Param(
            'checkId',
            ParseUUIDPipe,
        )
        checkId:
            string,

        @CurrentUser()
        user:
            AuthenticatedUser,
    ) {
        await this.access
            .assertCanManage(
                workspaceId,
                user.id,
            );

        return this.runner
            .run(
                workspaceId,
                checkId,
            );
    }

    @Get(
        'checks/:checkId/history',
    )
    getHistory(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId:
            string,

        @Param(
            'checkId',
            ParseUUIDPipe,
        )
        checkId:
            string,
    ) {
        return this.monitoring
            .getHistory(
                workspaceId,
                checkId,
            );
    }

    @Get('incidents')
    getIncidents(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId:
            string,

        @Query()
        query:
            IncidentListQueryDto,
    ) {
        return this.monitoring
            .getIncidents(
                workspaceId,
                query,
            );
    }

    @Get(
        'applications/:applicationId/summary',
    )
    getApplicationSummary(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId:
            string,

        @Param(
            'applicationId',
            ParseUUIDPipe,
        )
        applicationId:
            string,
    ) {
        return this.monitoring
            .getApplicationSummary(
                workspaceId,
                applicationId,
            );
    }
}