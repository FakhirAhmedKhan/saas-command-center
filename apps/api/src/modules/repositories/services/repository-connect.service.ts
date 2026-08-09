import { createHash, randomBytes } from 'node:crypto';

import {
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { WorkspaceRole } from 'src/generated/prisma/enums';

import {
    CompleteGithubCallbackDto,
    CompleteGithubSetupDto,
} from '../dto/repository.dto';

import { GithubAppService } from './github-app.service';
import { RepositoriesService } from './repositories.service';

const CONNECT_TTL_MS = 10 * 60 * 1000;

interface ConnectIntentRecord {
    id: string;
    workspaceId: string;
    userId: string;
    expiresAt: Date;
    consumedAt: Date | null;
    installationId: string | null;
    pkceVerifier: string | null;
}

@Injectable()
export class RepositoryConnectService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly githubApp: GithubAppService,
        private readonly repositoriesService: RepositoriesService,
    ) { }

    async begin(workspaceId: string, userId: string) {
        await this.assertCanManage(workspaceId, userId);

        const installState = this.randomSecret();

        await this.prisma.repositoryConnectIntent.create({
            data: {
                workspaceId,
                userId,

                installStateHash: this.hash(installState),

                expiresAt: new Date(Date.now() + CONNECT_TTL_MS),
            },
        });

        return {
            installationUrl: this.githubApp.buildInstallationUrl(installState),
        };
    }

    async completeSetup(userId: string, dto: CompleteGithubSetupDto) {
        const intent = await this.prisma.repositoryConnectIntent.findUnique({
            where: {
                installStateHash: this.hash(dto.installState),
            },
        });

        this.assertUsableIntent(intent, userId);

        await this.assertCanManage(intent.workspaceId, userId);

        await this.githubApp.getInstallation(dto.installationId);

        const oauthState = this.randomSecret();

        const verifier = randomBytes(48).toString('base64url');

        const challenge = createHash('sha256').update(verifier).digest('base64url');

        await this.prisma.repositoryConnectIntent.update({
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
            authorizationUrl: this.githubApp.buildUserAuthorizationUrl(
                oauthState,
                challenge,
            ),
        };
    }

    async completeCallback(userId: string, dto: CompleteGithubCallbackDto) {
        const intent = await this.prisma.repositoryConnectIntent.findUnique({
            where: {
                oauthStateHash: this.hash(dto.state),
            },
        });

        this.assertUsableIntent(intent, userId);

        await this.assertCanManage(intent.workspaceId, userId);

        if (!intent.installationId || !intent.pkceVerifier) {
            throw new UnauthorizedException('GitHub connection state is incomplete.');
        }

        const userAccessToken = await this.githubApp.exchangeUserCode(
            dto.code,
            intent.pkceVerifier,
        );

        const authorized = await this.githubApp.userCanAccessInstallation(
            userAccessToken,
            intent.installationId,
        );

        if (!authorized) {
            throw new ForbiddenException(
                'This GitHub user cannot access the selected installation.',
            );
        }

        const syncResult = await this.repositoriesService.syncInstallation(
            intent.workspaceId,
            intent.installationId,
            userId,
        );

        await this.prisma.repositoryConnectIntent.update({
            where: {
                id: intent.id,
            },

            data: {
                consumedAt: new Date(),
                pkceVerifier: null,
            },
        });

        return {
            workspaceId: intent.workspaceId,
            repositoryCount: syncResult.repositoryCount,
        };
    }

    private async assertCanManage(workspaceId: string, userId: string): Promise<void> {
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },

            select: {
                role: true,
            },
        });

        if (
            !membership ||
            (membership.role !== WorkspaceRole.OWNER &&
                membership.role !== WorkspaceRole.ADMIN)
        ) {
            throw new ForbiddenException(
                'Only workspace owners and admins can manage GitHub connections.',
            );
        }
    }

    private assertUsableIntent(
        intent: ConnectIntentRecord | null,
        userId: string,
    ): asserts intent is ConnectIntentRecord {
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