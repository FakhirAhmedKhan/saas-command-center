import {
    BadRequestException,
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import {
    Prisma,
} from 'src/generated/prisma/client';

import {
    WorkspaceRole,
} from 'src/generated/prisma/enums';

import { CreateWorkspaceDto } from '../dto/create-workspace.dto';

@Injectable()
export class WorkspaceCreationService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async createForUser(
        userId: string,
        dto: CreateWorkspaceDto,
    ) {
        const user =
            await this.prisma.user.findFirst({
                where: {
                    id: userId,
                    isActive: true,
                    deletedAt: null,
                },

                select: {
                    id: true,
                },
            });

        if (!user) {
            throw new UnauthorizedException(
                'Your account is not available',
            );
        }

        const name = this.normalizeName(
            dto.name,
        );

        const baseSlug = this.normalizeSlug(
            dto.slug ?? name,
        );

        /*
         * Retry with suffixes if another workspace
         * already uses the requested slug.
         */
        for (
            let attempt = 0;
            attempt < 25;
            attempt += 1
        ) {
            const slug =
                this.buildSlugCandidate(
                    baseSlug,
                    attempt,
                );

            try {
                return await this.prisma.$transaction(
                    async (transaction) => {
                        const workspace =
                            await transaction.workspace.create({
                                data: {
                                    name,
                                    slug,
                                    ownerId: userId,
                                },
                            });

                        await transaction.workspaceMember.create({
                            data: {
                                workspaceId: workspace.id,
                                userId,
                                role: WorkspaceRole.OWNER,
                            },
                        });

                        return transaction.workspace.findUniqueOrThrow({
                            where: {
                                id: workspace.id,
                            },

                            include: {
                                members: {
                                    where: {
                                        userId,
                                    },

                                    select: {
                                        id: true,
                                        userId: true,
                                        role: true,
                                        joinedAt: true,
                                    },
                                },

                                _count: {
                                    select: {
                                        members: true,
                                        saasApplications: true,
                                    },
                                },
                            },
                        });
                    },
                );
            } catch (error: unknown) {
                if (
                    this.isUniqueConstraintError(
                        error,
                    )
                ) {
                    continue;
                }

                throw error;
            }
        }

        throw new ConflictException(
            'Unable to generate an available workspace slug',
        );
    }

    private normalizeName(
        value: string,
    ): string {
        const name = value
            .trim()
            .replace(/\s+/g, ' ');

        if (name.length < 2) {
            throw new BadRequestException(
                'Workspace name must contain at least two characters',
            );
        }

        if (name.length > 120) {
            throw new BadRequestException(
                'Workspace name cannot exceed 120 characters',
            );
        }

        return name;
    }

    private normalizeSlug(
        value: string,
    ): string {
        const slug = value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (slug.length < 2) {
            throw new BadRequestException(
                'Workspace slug must contain at least two valid characters',
            );
        }

        return slug.slice(0, 120);
    }

    private buildSlugCandidate(
        baseSlug: string,
        attempt: number,
    ): string {
        if (attempt === 0) {
            return baseSlug.slice(0, 120);
        }

        const suffix = `-${attempt + 1}`;

        return `${baseSlug.slice(
            0,
            120 - suffix.length,
        )}${suffix}`;
    }

    private isUniqueConstraintError(
        error: unknown,
    ): boolean {
        return (
            error instanceof
            Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        );
    }
}