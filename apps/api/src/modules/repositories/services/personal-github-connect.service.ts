import { GithubAppService } from './github-app.service';
import { CompletePersonalGithubCallbackDto, CompletePersonalGithubSetupDto } from '../dto/repository.dto';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from 'src/database/prisma.service';

const CONNECT_TTL_MS = 10 * 60 * 1000;

interface PersonalConnectIntentRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
  installationId: string | null;
  pkceVerifier: string | null;
}

@Injectable()
export class PersonalGithubConnectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly githubApp: GithubAppService,
  ) {}

  async begin(userId: string) {
    const installState = this.randomSecret();

    await this.prisma.personalGithubConnectIntent.create({
      data: {
        userId,

        installStateHash: this.hash(installState),

        expiresAt: new Date(Date.now() + CONNECT_TTL_MS),
      },
    });

    return {
      installationUrl: this.githubApp.buildInstallationUrl(installState),
    };
  }

  async completeSetup(userId: string, dto: CompletePersonalGithubSetupDto) {
    const intent = await this.prisma.personalGithubConnectIntent.findUnique({
      where: {
        installStateHash: this.hash(dto.installState),
      },
    });

    this.assertUsableIntent(intent, userId);

    await this.githubApp.getInstallation(dto.installationId);

    const oauthState = this.randomSecret();

    const verifier = randomBytes(48).toString('base64url');

    const challenge = createHash('sha256').update(verifier).digest('base64url');

    await this.prisma.personalGithubConnectIntent.update({
      where: {
        id: intent.id,
      },

      data: {
        oauthStateHash: this.hash(oauthState),
        pkceVerifier: verifier,
        installationId: dto.installationId,
      },
    });

    return {
      authorizationUrl: this.githubApp.buildUserAuthorizationUrl(oauthState, challenge),
    };
  }

  async completeCallback(userId: string, dto: CompletePersonalGithubCallbackDto) {
    const intent = await this.prisma.personalGithubConnectIntent.findUnique({
      where: {
        oauthStateHash: this.hash(dto.state),
      },
    });

    this.assertUsableIntent(intent, userId);

    if (!intent.installationId || !intent.pkceVerifier) {
      throw new UnauthorizedException('GitHub connection state is incomplete.');
    }

    const userAccessToken = await this.githubApp.exchangeUserCode(dto.code, intent.pkceVerifier);

    const authorized = await this.githubApp.userCanAccessInstallation(userAccessToken, intent.installationId);

    if (!authorized) {
      throw new ForbiddenException('This GitHub user cannot access the selected installation.');
    }

    const installation = await this.githubApp.getInstallation(intent.installationId);

    await this.prisma.personalGithubConnectIntent.update({
      where: {
        id: intent.id,
      },

      data: {
        consumedAt: new Date(),
        pkceVerifier: null,
      },
    });

    const repositories = await this.githubApp.listImportableInstallationRepositories(intent.installationId);

    return {
      installationId: intent.installationId,
      accountLogin: installation.accountLogin,
      accountType: installation.accountType,
      repositoryCount: repositories.length,
    };
  }

  /**
   * A user may access an installation once GitHub has confirmed it via
   * completeCallback for that user. No GitHub token is stored, so this
   * checks only that a consumed, non-expired intent recorded the pairing.
   */
  async assertUserCanAccessInstallation(userId: string, installationId: string): Promise<void> {
    const intent = await this.prisma.personalGithubConnectIntent.findFirst({
      where: {
        userId,
        installationId,
        consumedAt: {
          not: null,
        },
      },

      select: {
        id: true,
      },
    });

    if (!intent) {
      throw new ForbiddenException('Connect this GitHub installation before accessing its repositories.');
    }
  }

  async listAccessibleInstallationIds(userId: string): Promise<string[]> {
    const intents = await this.prisma.personalGithubConnectIntent.findMany({
      where: {
        userId,
        consumedAt: {
          not: null,
        },

        installationId: {
          not: null,
        },
      },

      distinct: ['installationId'],

      select: {
        installationId: true,
      },

      orderBy: {
        consumedAt: 'desc',
      },
    });

    return intents.map((intent) => intent.installationId).filter((installationId): installationId is string => installationId !== null);
  }

  private assertUsableIntent(intent: PersonalConnectIntentRecord | null, userId: string): asserts intent is PersonalConnectIntentRecord {
    if (!intent || intent.userId !== userId) {
      throw new UnauthorizedException('GitHub connection state is invalid.');
    }

    if (intent.consumedAt || intent.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('GitHub connection state has expired.');
    }
  }

  private randomSecret(): string {
    return randomBytes(32).toString('base64url');
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
