import { Public } from '../../auth/decorators/public.decorator';
import { GithubWebhookService } from '../services/github-webhook.service';
import { Controller, Headers, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

type GithubWebhookRequest = Request<Record<string, never>, unknown, Buffer>;

@ApiTags('Repository GitHub Webhook')
@Public()
@Controller('repositories/github')
export class GithubWebhookController {
  constructor(private readonly githubWebhookService: GithubWebhookService) {}

  @Post('webhook')
  handle(
    @Req()
    request: GithubWebhookRequest,

    @Headers('x-github-delivery')
    deliveryId?: string,

    @Headers('x-github-event')
    event?: string,

    @Headers('x-hub-signature-256')
    signature?: string,
  ) {
    if (!deliveryId || !event || !signature) {
      throw new UnauthorizedException('Required GitHub webhook headers are missing.');
    }

    if (!Buffer.isBuffer(request.body)) {
      throw new UnauthorizedException('GitHub webhook raw body is unavailable.');
    }

    return this.githubWebhookService.handle(request.body, deliveryId, event, signature);
  }
}
