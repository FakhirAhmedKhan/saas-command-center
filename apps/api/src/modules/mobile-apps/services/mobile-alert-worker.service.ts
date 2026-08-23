import { MobileAlertsService } from './mobile-alerts.service';
import { PrismaService } from '../../../database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class MobileAlertWorkerService {
  private readonly logger = new Logger(MobileAlertWorkerService.name);

  private running = false;

  constructor(
    private readonly prisma: PrismaService,

    private readonly alerts: MobileAlertsService,
  ) {}

  @Interval(60_000)
  async tick() {
    if (this.running || process.env.NODE_ENV === 'test') {
      return;
    }

    this.running = true;

    try {
      const apps = await this.prisma.mobileApplication.findMany({
        where: {
          mobileAlertRules: {
            some: {
              enabled: true,
            },
          },
        },

        select: {
          id: true,

          application: {
            select: {
              workspaceId: true,

              archivedAt: true,
            },
          },
        },
      });

      for (const app of apps) {
        if (app.application.archivedAt) {
          continue;
        }

        try {
          await this.alerts.evaluateApp(
            app.application.workspaceId,

            app.id,
          );
        } catch (error) {
          this.logger.warn(`Alert evaluation failed for mobile app ${app.id}: ${error instanceof Error ? error.message : 'unknown'}`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
