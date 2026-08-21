import type { TypedConfigService } from '../../../config/runtime-config';
import { PrismaService } from '../../../database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

/*
 * Only expired, never-consumed intents are removed here. A consumed
 * PersonalGithubConnectIntent doubles as the durable proof that a user
 * completed the GitHub OAuth handshake for an installation (see
 * PersonalGithubConnectService.assertUserCanAccessInstallation /
 * listAccessibleInstallationIds, which query consumed intents indefinitely)
 * -- deleting those rows would silently revoke access, so consumedAt is
 * never part of the deletion filter for that model.
 */
@Injectable()
export class GithubConnectIntentCleanupService {
  private readonly logger = new Logger(GithubConnectIntentCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,

    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async cleanup(): Promise<void> {
    if (
      !this.config.get('GITHUB_CONNECT_INTENT_CLEANUP_ENABLED', {
        infer: true,
      })
    ) {
      return;
    }

    const now = new Date();

    const [personalIntents, repositoryIntents] = await Promise.all([
      this.prisma.personalGithubConnectIntent.deleteMany({
        where: {
          consumedAt: null,
          expiresAt: {
            lte: now,
          },
        },
      }),

      this.prisma.repositoryConnectIntent.deleteMany({
        where: {
          expiresAt: {
            lte: now,
          },
        },
      }),
    ]);

    this.logger.log(
      JSON.stringify({
        event: 'github_connect_intent_cleanup',
        removedPersonalIntents: personalIntents.count,
        removedRepositoryIntents: repositoryIntents.count,
      }),
    );
  }
}
