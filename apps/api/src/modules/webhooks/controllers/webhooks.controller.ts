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

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SharedRateLimit } from '../../../common/rate-limit/shared-rate-limit.decorator';

import { SharedRateLimitGuard } from '../../../common/rate-limit/shared-rate-limit.guard';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';

import {
  CreateWebhookEndpointDto,
  UpdateWebhookEndpointDto,
  WebhookDeliveryListQueryDto,
} from '../dto/webhook.dto';

import { WebhookManagementService } from '../services/webhook-management.service';
import { AuthenticatedUser } from 'src/modules/auth/interfaces/authenticated-user.interface';

@ApiTags('Webhook Integrations')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/integrations/webhooks')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, SharedRateLimitGuard)
export class WebhooksController {
  constructor(private readonly webhooks: WebhookManagementService) {}

  @Get()
  getWebhooks(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.webhooks.list(workspaceId, user.id);
  }

  @Post()
  @SharedRateLimit({
    scope: 'webhook-create',

    limit: 20,

    windowSeconds: 60 * 60,
  })
  @ApiOperation({
    summary: 'Create a signed webhook endpoint',
  })
  create(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    input: CreateWebhookEndpointDto,
  ) {
    return this.webhooks.create(workspaceId, user.id, input);
  }

  @Patch(':endpointId')
  update(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('endpointId', ParseUUIDPipe)
    endpointId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    input: UpdateWebhookEndpointDto,
  ) {
    return this.webhooks.update(workspaceId, endpointId, user.id, input);
  }

  @Post(':endpointId/disable')
  disable(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('endpointId', ParseUUIDPipe)
    endpointId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.webhooks.disable(workspaceId, endpointId, user.id);
  }

  @Post(':endpointId/rotate-secret')
  @SharedRateLimit({
    scope: 'webhook-secret-rotation',

    limit: 5,

    windowSeconds: 60 * 60,
  })
  rotateSecret(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('endpointId', ParseUUIDPipe)
    endpointId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.webhooks.rotateSecret(workspaceId, endpointId, user.id);
  }

  @Post(':endpointId/test')
  @SharedRateLimit({
    scope: 'webhook-test-delivery',

    limit: 10,

    windowSeconds: 5 * 60,
  })
  testDelivery(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('endpointId', ParseUUIDPipe)
    endpointId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.webhooks.testDelivery(workspaceId, endpointId, user.id);
  }

  @Get(':endpointId/deliveries')
  getDeliveries(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('endpointId', ParseUUIDPipe)
    endpointId: string,

    @Query()
    query: WebhookDeliveryListQueryDto,
  ) {
    return this.webhooks.listDeliveries(workspaceId, endpointId, query);
  }
}
