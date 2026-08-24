import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class VisitorRebuilderService {
  async rebuild(transaction: Prisma.TransactionClient, visitorId: string): Promise<void> {
    /*
     * Keep these operations sequential.
     *
     * Earlier E2E runs exposed the pg warning caused by
     * concurrent queries on one interactive-transaction
     * client. Sequential execution avoids that problem.
     */
    const eventStats = await transaction.analyticsEvent.aggregate({
      where: {
        visitorId,
      },

      _min: {
        occurredAt: true,
      },

      _max: {
        occurredAt: true,
      },
    });
    const sessionCount = await transaction.analyticsSession.count({
      where: {
        visitorId,
      },
    });
    const pageViewCount = await transaction.analyticsPageView.count({
      where: {
        visitorId,
      },
    });
    const eventCount = await transaction.analyticsEvent.count({
      where: {
        visitorId,
      },
    });
    const firstSeenAt = eventStats._min.occurredAt;
    const lastSeenAt = eventStats._max.occurredAt;

    if (!firstSeenAt || !lastSeenAt) {
      return;
    }

    await transaction.analyticsVisitor.update({
      where: {
        id: visitorId,
      },

      data: {
        firstSeenAt,
        lastSeenAt,
        sessionCount,
        pageViewCount,
        eventCount,
      },
    });
  }

  async rebuildVisitor(transaction: Prisma.TransactionClient, visitorId: string): Promise<void> {
    await this.rebuild(transaction, visitorId);
  }

  async rebuildMany(transaction: Prisma.TransactionClient, visitorIds: readonly string[]): Promise<void> {
    for (const visitorId of visitorIds) {
      await this.rebuild(transaction, visitorId);
    }
  }
}
