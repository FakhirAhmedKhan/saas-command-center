import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma, User } from 'src/generated/prisma/client';

export const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  isActive: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName?: string | null;
}

export interface UpdateUserProfileInput {
  displayName?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput): Promise<PublicUser> {
    return this.prisma.user.create({
      data: {
        email: this.normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        displayName: this.normalizeDisplayName(input.displayName),
      },
      select: publicUserSelect,
    });
  }

  async findById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: publicUserSelect,
    });
  }

  async findByIdOrThrow(id: string): Promise<PublicUser> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
  async findActiveById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        isActive: true,
        deletedAt: null,
      },
      select: publicUserSelect,
    });
  }
  async findByEmail(email: string): Promise<PublicUser | null> {
    return this.prisma.user.findFirst({
      where: {
        email: this.normalizeEmail(email),
        deletedAt: null,
      },
      select: publicUserSelect,
    });
  }

  /**
   * Internal authentication method.
   * This returns passwordHash and must never be exposed from a controller.
   */
  async findAuthenticationRecordByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email: this.normalizeEmail(email),
        isActive: true,
        deletedAt: null,
      },
    });
  }

  async updateProfile(id: string, input: UpdateUserProfileInput): Promise<PublicUser> {
    await this.findByIdOrThrow(id);

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        ...(input.displayName !== undefined
          ? {
              displayName: this.normalizeDisplayName(input.displayName),
            }
          : {}),
      },
      select: publicUserSelect,
    });
  }

  async markLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  async verifyEmail(id: string): Promise<PublicUser> {
    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        emailVerifiedAt: new Date(),
      },
      select: publicUserSelect,
    });
  }

  async softDelete(id: string): Promise<PublicUser> {
    await this.findByIdOrThrow(id);

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      select: publicUserSelect,
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeDisplayName(displayName?: string | null): string | null {
    if (displayName === undefined || displayName === null) {
      return null;
    }

    const normalized = displayName.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
