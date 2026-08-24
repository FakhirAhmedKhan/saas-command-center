import { DesktopAlertsService } from './desktop-alerts.service';
import { PrismaService } from '../../../database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DesktopAlertWorkerService {
  private readonly logger = new Logger(DesktopAlertWorkerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: DesktopAlertsService,
  ) {}

  async runOnce() {
    if (this.running) {
      return { skipped: true, reason: 'already-running' as const };
    }

    this.running = true;

    try {
      const apps = await this.prisma.desktopApplication.findMany({
        where: {
          alertRules: { some: { enabled: true } },
          application: { archivedAt: null },
        },
        select: {
          id: true,
          application: {
            select: { workspaceId: true },
          },
        },
      });

      let evaluated = 0;
      let failed = 0;

      for (const app of apps) {
        try {
          await this.alerts.evaluateApp(app.application.workspaceId, app.id);
          evaluated += 1;
        } catch (error) {
          failed += 1;
          this.logger.error(`Desktop alert evaluation failed for ${app.id}`, error instanceof Error ? error.stack : undefined);
        }
      }

      return {
        skipped: false,
        apps: apps.length,
        evaluated,
        failed,
      };
    } finally {
      this.running = false;
    }
  }
}
