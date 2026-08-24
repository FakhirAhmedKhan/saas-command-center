import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';

export type AnalyticsPageViewRecord = Prisma.AnalyticsPageViewGetPayload<Record<string, never>>;

export interface RebuiltPageViews {
  pageViews: AnalyticsPageViewRecord[];
  firstPage: AnalyticsPageViewRecord | null;
  lastPage: AnalyticsPageViewRecord | null;
}

@Injectable()
export class PageViewRebuilderService {
  async rebuildForSession(transaction: Prisma.TransactionClient, sessionId: string): Promise<RebuiltPageViews> {
    const pageViews = await transaction.analyticsPageView.findMany({
      where: {
        sessionId,
      },

      orderBy: [
        {
          occurredAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
    const firstPage = pageViews[0] ?? null;
    const lastPage = pageViews.at(-1) ?? null;

    await transaction.analyticsPageView.updateMany({
      where: {
        sessionId,
      },

      data: {
        isEntry: false,
        isExit: false,
      },
    });

    if (firstPage && lastPage && firstPage.id === lastPage.id) {
      await transaction.analyticsPageView.update({
        where: {
          id: firstPage.id,
        },

        data: {
          isEntry: true,
          isExit: true,
        },
      });
    } else {
      if (firstPage) {
        await transaction.analyticsPageView.update({
          where: {
            id: firstPage.id,
          },

          data: {
            isEntry: true,
          },
        });
      }

      if (lastPage) {
        await transaction.analyticsPageView.update({
          where: {
            id: lastPage.id,
          },

          data: {
            isExit: true,
          },
        });
      }
    }

    return {
      pageViews,
      firstPage,
      lastPage,
    };
  }

  async rebuild(transaction: Prisma.TransactionClient, sessionId: string): Promise<RebuiltPageViews> {
    return this.rebuildForSession(transaction, sessionId);
  }

  async rebuildMany(transaction: Prisma.TransactionClient, sessionIds: readonly string[]): Promise<RebuiltPageViews[]> {
    const results: RebuiltPageViews[] = [];

    for (const sessionId of sessionIds) {
      results.push(await this.rebuildForSession(transaction, sessionId));
    }

    return results;
  }
}
