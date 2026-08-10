import { CreateWebsiteDto, WebsiteListQueryDto, UpdateWebsiteDto, ConnectWebsiteDto } from '../dto/website.dto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { ActivityActorType, ActivityEntityType, ApplicationActivityType } from 'src/generated/prisma/enums';
import { ActivityWriterService } from 'src/modules/activity/services/activity-writer.service';

const websiteSelect = {
  id: true,
  workspaceId: true,
  applicationId: true,
  name: true,
  domain: true,
  timeZone: true,
  enabled: true,
  allowedOrigins: true,
  trackingKeyPrefix: true,
  trackingKeyRotatedAt: true,
  lastEventAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,

  application: {
    select: {
      id: true,
      name: true,
      slug: true,
      archivedAt: true,
    },
  },
} satisfies Prisma.WebsiteSelect;

export type WebsiteView = Prisma.WebsiteGetPayload<{
  select: typeof websiteSelect;
}>;

interface GeneratedTrackingKey {
  rawKey: string;
  prefix: string;
  hash: string;
}

@Injectable()
export class WebsitesService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly activityWriter: ActivityWriterService,
  ) {}

  async create(
    workspaceId: string,
    dto: CreateWebsiteDto,
    actorUserId: string,
  ): Promise<{
    website: WebsiteView;
    trackingKey: string;
  }> {
    const name = this.normalizeRequiredText(dto.name, 'Website name');

    const domain = this.normalizeDomain(dto.domain);

    const timeZone = this.normalizeTimeZone(dto.timeZone ?? 'UTC');

    const allowedOrigins = this.normalizeAllowedOrigins(dto.allowedOrigins, domain);

    let application: {
      id: string;
      name: string;
    } | null = null;

    if (dto.applicationId) {
      application = await this.requireApplication(this.prisma, workspaceId, dto.applicationId);
    }

    const existing = await this.prisma.website.findUnique({
      where: {
        workspaceId_domain: {
          workspaceId,
          domain,
        },
      },

      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('A website with this domain already exists in the workspace');
    }

    const generatedKey = this.generateTrackingKey();

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.website.create({
          data: {
            workspaceId,
            applicationId: application?.id ?? null,
            name,
            domain,
            timeZone,
            allowedOrigins,
            enabled: dto.enabled ?? true,
            trackingKeyPrefix: generatedKey.prefix,
            trackingKeyHash: generatedKey.hash,
          },

          select: websiteSelect,
        });

        await this.writeActivity(transaction, created, actorUserId, {
          activityType: ApplicationActivityType.WEBSITE_CREATED,

          title: 'Website created',

          description: `${created.name} was added to the website registry.`,

          metadata: {
            domain: created.domain,

            timeZone: created.timeZone,

            enabled: created.enabled,

            allowedOrigins: created.allowedOrigins,

            applicationId: created.applicationId,
          },
        });

        return {
          website: created,
          trackingKey: generatedKey.rawKey,
        };
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  async list(workspaceId: string, query: WebsiteListQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const search = query.search?.trim();

    const where: Prisma.WebsiteWhereInput = {
      workspaceId,

      archivedAt:
        query.archived === true
          ? {
              not: null,
            }
          : null,

      ...(query.enabled !== undefined
        ? {
            enabled: query.enabled,
          }
        : {}),

      ...(query.applicationId
        ? {
            applicationId: query.applicationId,
          }
        : {}),

      ...(query.connected !== undefined
        ? query.connected
          ? {
              applicationId: {
                not: null,
              },
            }
          : {
              applicationId: null,
            }
        : {}),

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                domain: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                application: {
                  is: {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    if (query.enabled !== undefined) {
      where.enabled = query.enabled;
    }

    if (query.applicationId) {
      where.applicationId = query.applicationId;
    } else if (query.connected !== undefined) {
      where.applicationId = query.connected
        ? {
            not: null,
          }
        : null;
    }
    const [websites, total] = await this.prisma.$transaction([
      this.prisma.website.findMany({
        where,
        select: websiteSelect,
        orderBy: [
          {
            updatedAt: 'desc',
          },
          {
            name: 'asc',
          },
        ],
        skip,
        take: query.limit,
      }),

      this.prisma.website.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      data: websites,

      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async findOne(workspaceId: string, websiteId: string): Promise<WebsiteView> {
    return this.requireWebsite(this.prisma, workspaceId, websiteId);
  }

  async update(workspaceId: string, websiteId: string, dto: UpdateWebsiteDto, actorUserId: string): Promise<WebsiteView> {
    const website = await this.requireWebsite(this.prisma, workspaceId, websiteId);

    this.ensureNotArchived(website);

    const data: Prisma.WebsiteUpdateInput = {};

    const changedFields: string[] = [];

    let newDomain = website.domain;

    if (dto.name !== undefined) {
      const name = this.normalizeRequiredText(dto.name, 'Website name');

      if (name !== website.name) {
        data.name = name;
        changedFields.push('name');
      }
    }

    if (dto.domain !== undefined) {
      newDomain = this.normalizeDomain(dto.domain);

      if (newDomain !== website.domain) {
        const existing = await this.prisma.website.findFirst({
          where: {
            workspaceId,
            domain: newDomain,

            id: {
              not: websiteId,
            },
          },

          select: {
            id: true,
          },
        });

        if (existing) {
          throw new ConflictException('A website with this domain already exists in the workspace');
        }

        data.domain = newDomain;

        changedFields.push('domain');
      }
    }

    if (dto.timeZone !== undefined) {
      const timeZone = this.normalizeTimeZone(dto.timeZone);

      if (timeZone !== website.timeZone) {
        data.timeZone = timeZone;

        changedFields.push('timeZone');
      }
    }

    if (dto.allowedOrigins !== undefined) {
      const allowedOrigins = this.normalizeAllowedOrigins(dto.allowedOrigins, newDomain);

      if (JSON.stringify(allowedOrigins) !== JSON.stringify(website.allowedOrigins)) {
        data.allowedOrigins = {
          set: allowedOrigins,
        };

        changedFields.push('allowedOrigins');
      }
    } else if (newDomain !== website.domain) {
      data.allowedOrigins = {
        set: this.normalizeAllowedOrigins(undefined, newDomain),
      };

      changedFields.push('allowedOrigins');
    }

    if (dto.enabled !== undefined && dto.enabled !== website.enabled) {
      data.enabled = dto.enabled;

      changedFields.push('enabled');
    }

    /*
     * applicationId is intentionally ignored.
     * Use the connect/disconnect endpoints.
     */
    if (changedFields.length === 0) {
      return website;
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.website.update({
          where: {
            id: websiteId,
          },

          data,

          select: websiteSelect,
        });

        await this.writeActivity(transaction, updated, actorUserId, {
          activityType: ApplicationActivityType.WEBSITE_UPDATED,

          title: 'Website updated',

          description: `${updated.name} configuration was updated.`,

          metadata: {
            changedFields,

            previous: {
              name: website.name,
              domain: website.domain,
              timeZone: website.timeZone,
              enabled: website.enabled,
              allowedOrigins: website.allowedOrigins,
            },

            current: {
              name: updated.name,
              domain: updated.domain,
              timeZone: updated.timeZone,
              enabled: updated.enabled,
              allowedOrigins: updated.allowedOrigins,
            },
          },
        });

        return updated;
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  async enable(workspaceId: string, websiteId: string, actorUserId: string): Promise<WebsiteView> {
    const website = await this.requireWebsite(this.prisma, workspaceId, websiteId);

    this.ensureNotArchived(website);

    if (website.enabled) {
      return website;
    }

    return this.updateEnabledState(workspaceId, website, true, actorUserId);
  }

  async disable(workspaceId: string, websiteId: string, actorUserId: string): Promise<WebsiteView> {
    const website = await this.requireWebsite(this.prisma, workspaceId, websiteId);

    if (!website.enabled) {
      return website;
    }

    return this.updateEnabledState(workspaceId, website, false, actorUserId);
  }

  async archive(workspaceId: string, websiteId: string, actorUserId: string): Promise<WebsiteView> {
    const website = await this.requireWebsite(this.prisma, workspaceId, websiteId);

    if (website.archivedAt) {
      return website;
    }

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.website.update({
        where: {
          id: websiteId,
        },

        data: {
          enabled: false,
          archivedAt: new Date(),
        },

        select: websiteSelect,
      });

      await this.writeActivity(transaction, updated, actorUserId, {
        activityType: ApplicationActivityType.WEBSITE_ARCHIVED,

        title: 'Website archived',

        description: `${updated.name} was archived and tracking was disabled.`,
      });

      return updated;
    });
  }

  async restore(workspaceId: string, websiteId: string, actorUserId: string): Promise<WebsiteView> {
    const website = await this.requireWebsite(this.prisma, workspaceId, websiteId);

    if (!website.archivedAt) {
      return website;
    }

    return this.prisma.$transaction(async (transaction) => {
      /*
       * Restored websites remain disabled.
       * The user must explicitly enable tracking.
       */
      const updated = await transaction.website.update({
        where: {
          id: websiteId,
        },

        data: {
          archivedAt: null,
          enabled: false,
        },

        select: websiteSelect,
      });

      await this.writeActivity(transaction, updated, actorUserId, {
        activityType: ApplicationActivityType.WEBSITE_RESTORED,

        title: 'Website restored',

        description: `${updated.name} was restored. Tracking remains disabled until enabled manually.`,
      });

      return updated;
    });
  }

  async rotateTrackingKey(
    workspaceId: string,
    websiteId: string,
    actorUserId: string,
  ): Promise<{
    website: WebsiteView;
    trackingKey: string;
  }> {
    const website = await this.requireWebsite(this.prisma, workspaceId, websiteId);

    this.ensureNotArchived(website);

    const generatedKey = this.generateTrackingKey();

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.website.update({
        where: {
          id: websiteId,
        },

        data: {
          trackingKeyPrefix: generatedKey.prefix,

          trackingKeyHash: generatedKey.hash,

          trackingKeyRotatedAt: new Date(),
        },

        select: websiteSelect,
      });

      await this.writeActivity(transaction, updated, actorUserId, {
        activityType: ApplicationActivityType.WEBSITE_TRACKING_KEY_ROTATED,

        title: 'Tracking key rotated',

        description: `${updated.name} received a new tracking key.`,

        metadata: {
          previousPrefix: website.trackingKeyPrefix,

          currentPrefix: updated.trackingKeyPrefix,
        },
      });

      return {
        website: updated,
        trackingKey: generatedKey.rawKey,
      };
    });
  }

  async connect(workspaceId: string, websiteId: string, dto: ConnectWebsiteDto, actorUserId: string): Promise<WebsiteView> {
    const website = await this.requireWebsite(this.prisma, workspaceId, websiteId);

    this.ensureNotArchived(website);

    const application = await this.requireApplication(this.prisma, workspaceId, dto.applicationId);

    if (website.applicationId === application.id) {
      return website;
    }

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.website.update({
        where: {
          id: websiteId,
        },

        data: {
          applicationId: application.id,
        },

        select: websiteSelect,
      });

      await this.writeActivity(transaction, updated, actorUserId, {
        activityType: ApplicationActivityType.WEBSITE_CONNECTED,

        title: 'Website connected',

        description: `${updated.name} was connected to ${application.name}.`,

        metadata: {
          previousApplicationId: website.applicationId,

          currentApplicationId: application.id,

          currentApplicationName: application.name,
        },
      });

      return updated;
    });
  }

  async disconnect(workspaceId: string, websiteId: string, actorUserId: string): Promise<WebsiteView> {
    const website = await this.requireWebsite(this.prisma, workspaceId, websiteId);

    this.ensureNotArchived(website);

    if (!website.applicationId) {
      return website;
    }

    const previousApplication = website.application;

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.website.update({
        where: {
          id: websiteId,
        },

        data: {
          applicationId: null,
        },

        select: websiteSelect,
      });

      await this.writeActivity(transaction, updated, actorUserId, {
        activityType: ApplicationActivityType.WEBSITE_DISCONNECTED,

        title: 'Website disconnected',

        description: `${updated.name} was disconnected from its SaaS application.`,

        metadata: {
          previousApplicationId: website.applicationId,

          previousApplicationName: previousApplication?.name,
        },
      });

      return updated;
    });
  }

  private async updateEnabledState(workspaceId: string, website: WebsiteView, enabled: boolean, actorUserId: string): Promise<WebsiteView> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.website.update({
        where: {
          id: website.id,
        },

        data: {
          enabled,
        },

        select: websiteSelect,
      });

      await this.writeActivity(transaction, updated, actorUserId, {
        activityType: enabled ? ApplicationActivityType.WEBSITE_ENABLED : ApplicationActivityType.WEBSITE_DISABLED,

        title: enabled ? 'Website enabled' : 'Website disabled',

        description: enabled ? `${updated.name} is ready to accept tracking events.` : `${updated.name} will reject new tracking events.`,

        metadata: {
          enabled,
        },
      });

      return updated;
    });
  }

  private async requireWebsite(client: PrismaService | Prisma.TransactionClient, workspaceId: string, websiteId: string): Promise<WebsiteView> {
    const website = await client.website.findFirst({
      where: {
        id: websiteId,
        workspaceId,
      },

      select: websiteSelect,
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    return website;
  }

  private async requireApplication(
    client: PrismaService | Prisma.TransactionClient,
    workspaceId: string,
    applicationId: string,
  ): Promise<{
    id: string;
    name: string;
  }> {
    const application = await client.saasApplication.findFirst({
      where: {
        id: applicationId,
        workspaceId,
        archivedAt: null,
      },

      select: {
        id: true,
        name: true,
      },
    });

    if (!application) {
      throw new NotFoundException('SaaS application not found');
    }

    return application;
  }

  private ensureNotArchived(website: WebsiteView): void {
    if (website.archivedAt) {
      throw new ConflictException('Restore the website before modifying it');
    }
  }

  private generateTrackingKey(): GeneratedTrackingKey {
    const prefix = randomBytes(8).toString('hex');

    const secret = randomBytes(32).toString('base64url');

    const rawKey = `cc_live_${prefix}_${secret}`;

    const hash = createHash('sha256').update(rawKey).digest('hex');

    return {
      rawKey,
      prefix,
      hash,
    };
  }

  private normalizeDomain(value: string): string {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      throw new BadRequestException('Website domain is required');
    }

    if (normalized.includes('*')) {
      throw new BadRequestException('Wildcard domains are not supported');
    }

    let url: URL;

    try {
      url = new URL(normalized.includes('://') ? normalized : `https://${normalized}`);
    } catch {
      throw new BadRequestException('Website domain is invalid');
    }

    if (url.username || url.password || url.search || url.hash || (url.pathname !== '' && url.pathname !== '/')) {
      throw new BadRequestException('Domain cannot include credentials, paths, query parameters, or fragments');
    }

    if (!url.hostname) {
      throw new BadRequestException('Website domain is invalid');
    }

    const domain = url.port ? `${url.hostname}:${url.port}` : url.hostname;

    if (domain.length > 253) {
      throw new BadRequestException('Website domain is too long');
    }

    return domain;
  }

  private normalizeAllowedOrigins(values: string[] | undefined, domain: string): string[] {
    const source = values && values.length > 0 ? values : [this.defaultOrigin(domain)];

    const origins = source.map((value) => {
      let url: URL;

      try {
        url = new URL(value.trim());
      } catch {
        throw new BadRequestException(`Allowed origin "${value}" is invalid`);
      }

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new BadRequestException('Allowed origins must use HTTP or HTTPS');
      }

      if (url.username || url.password || url.search || url.hash || (url.pathname !== '' && url.pathname !== '/')) {
        throw new BadRequestException('Allowed origins cannot include paths, credentials, query parameters, or fragments');
      }

      return url.origin.toLowerCase();
    });

    return [...new Set(origins)];
  }

  private defaultOrigin(domain: string): string {
    const hostname = domain.split(':').at(0) ?? domain;

    const local = hostname === 'localhost' || hostname.endsWith('.localhost') || isIP(hostname) !== 0;

    return `${local ? 'http' : 'https'}://${domain}`;
  }

  private normalizeTimeZone(value: string): string {
    const timeZone = value.trim();

    if (!timeZone) {
      throw new BadRequestException('Time zone is required');
    }

    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone,
      }).format();
    } catch {
      throw new BadRequestException('Time zone must be a valid IANA time zone');
    }

    return timeZone;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private async writeActivity(
    transaction: Prisma.TransactionClient,
    website: WebsiteView,
    actorUserId: string,
    input: {
      activityType: ApplicationActivityType;
      title: string;
      description?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.activityWriter.writeWithTransaction(transaction, {
      workspaceId: website.workspaceId,

      applicationId: website.applicationId,

      applicationName: website.application?.name ?? website.name,

      actorType: ActivityActorType.USER,

      actorUserId,

      activityType: input.activityType,

      entityType: ActivityEntityType.WEBSITE,

      entityId: website.id,

      title: input.title,

      description: input.description,

      metadata: {
        websiteId: website.id,

        websiteName: website.name,

        domain: website.domain,

        ...input.metadata,
      },
    });
  }

  private handleUniqueConstraint(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A website with this domain or tracking-key identifier already exists');
    }
  }
}
