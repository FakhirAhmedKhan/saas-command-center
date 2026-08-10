import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { GithubAppService } from './github-app.service';
import { RepositoriesService } from './repositories.service';

interface GithubWebhookPayload {
  action?: string;

  installation?: {
    id?: number;
  };

  repository?: {
    id?: number;
  };
}

function isPrismaUniqueError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return error.code === 'P2002';
}

@Injectable()
export class GithubWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly githubApp: GithubAppService,
    private readonly repositoriesService: RepositoriesService,
  ) {}

  async handle(
    rawBody: Buffer,
    deliveryId: string,
    event: string,
    signature: string,
  ): Promise<{
    accepted: true;
    duplicate: boolean;
  }> {
    this.verifySignature(rawBody, signature);

    const existing = await this.prisma.repositoryWebhookDelivery.findUnique({
      where: {
        deliveryId,
      },

      select: {
        id: true,
      },
    });

    if (existing) {
      return {
        accepted: true,
        duplicate: true,
      };
    }

    let payload: GithubWebhookPayload;

    try {
      payload = JSON.parse(rawBody.toString('utf8')) as GithubWebhookPayload;
    } catch {
      throw new UnauthorizedException('GitHub webhook payload is invalid.');
    }

    const externalInstallationId = payload.installation?.id !== undefined ? String(payload.installation.id) : null;

    const externalRepoId = payload.repository?.id !== undefined ? String(payload.repository.id) : null;

    let deliveryRecordId: string;

    try {
      const created = await this.prisma.repositoryWebhookDelivery.create({
        data: {
          deliveryId,
          event,
          action: payload.action ?? null,
          externalInstallationId,
          externalRepoId,
        },

        select: {
          id: true,
        },
      });

      deliveryRecordId = created.id;
    } catch (error: unknown) {
      if (isPrismaUniqueError(error)) {
        return {
          accepted: true,
          duplicate: true,
        };
      }

      throw error;
    }

    try {
      await this.processEvent(event, payload.action, externalInstallationId, externalRepoId);

      await this.prisma.repositoryWebhookDelivery.update({
        where: {
          id: deliveryRecordId,
        },

        data: {
          processedAt: new Date(),
          errorMessage: null,
        },
      });

      return {
        accepted: true,
        duplicate: false,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message.slice(0, 2000) : 'Webhook processing failed.';

      await this.prisma.repositoryWebhookDelivery.update({
        where: {
          id: deliveryRecordId,
        },

        data: {
          errorMessage: message,
        },
      });

      throw error;
    }
  }

  private async processEvent(event: string, action: string | undefined, externalInstallationId: string | null, externalRepoId: string | null): Promise<void> {
    if (event === 'installation' && action === 'deleted' && externalInstallationId) {
      await this.repositoriesService.deleteInstallationEverywhere(externalInstallationId);

      return;
    }

    if ((event === 'installation_repositories' || event === 'repository') && externalInstallationId) {
      await this.repositoriesService.syncInstallationEverywhere(externalInstallationId);

      return;
    }

    if (event === 'push' && externalInstallationId && externalRepoId) {
      await this.repositoriesService.touchRepositoryEverywhere(externalInstallationId, externalRepoId);
    }
  }

  private verifySignature(rawBody: Buffer, signature: string): void {
    const expected = `sha256=${createHmac('sha256', this.githubApp.getWebhookSecret()).update(rawBody).digest('hex')}`;

    const providedBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
      throw new UnauthorizedException('GitHub webhook signature is invalid.');
    }
  }
}
