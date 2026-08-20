import { Prisma } from 'src/generated/prisma/client';
import { BlockerStatus } from 'src/generated/prisma/enums';

export const milestoneInclude = {
  tasks: {
    orderBy: [
      {
        position: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
    include: {
      assignee: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
      blockers: {
        where: {
          status: BlockerStatus.OPEN,
        },
        orderBy: {
          openedAt: 'desc',
        },
      },
    },
  },
  blockers: {
    where: {
      status: BlockerStatus.OPEN,
    },
    orderBy: {
      openedAt: 'desc',
    },
  },
} satisfies Prisma.ApplicationMilestoneInclude;
