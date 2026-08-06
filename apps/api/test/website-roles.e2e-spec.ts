/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type {
  INestApplication,
} from '@nestjs/common';

import request from 'supertest';

import {
  WorkspaceRole,
} from 'src/generated/prisma/enums';

import {
  PrismaService,
} from 'src/database/prisma.service';

import {
  createApplication,
  inWorkspace,
} from './helpers/application';

import {
  createTestApp,
} from './helpers/create-test-app';

import {
  resetDatabase,
} from './helpers/database';

import {
  addWorkspaceMember,
  expectAccessDenied,
  registerWorkspaceTestUser,
  type WorkspaceTestUser,
} from './helpers/workspace';

import {
  archiveWebsite,
  connectWebsite,
  createWebsite,
  disableWebsite,
  disconnectWebsite,
  enableWebsite,
  expectWebsiteSuccess,
  getWebsite,
  listWebsites,
  restoreWebsite,
  rotateWebsiteKey,
  updateWebsite,
  websiteRoutes,
} from './helpers/website';

interface RoleMatrix {
  owner: WorkspaceTestUser;
  admin: WorkspaceTestUser;
  developer: WorkspaceTestUser;
  viewer: WorkspaceTestUser;
}

describe(
  'Website Roles E2E',
  () => {
    let app:
      INestApplication;

    let prisma:
      PrismaService;

    beforeEach(
      async () => {
        app =
          await createTestApp();

        prisma =
          app.get(
            PrismaService,
          );

        await resetDatabase(
          prisma,
        );
      },
    );

    afterEach(
      async () => {
        await app.close();
      },
    );

    async function createRoleMatrix():
      Promise<RoleMatrix> {
      const owner =
        await registerWorkspaceTestUser(
          app,
          prisma,
        );

      const rawAdmin =
        await registerWorkspaceTestUser(
          app,
          prisma,
        );

      const rawDeveloper =
        await registerWorkspaceTestUser(
          app,
          prisma,
        );

      const rawViewer =
        await registerWorkspaceTestUser(
          app,
          prisma,
        );

      expectWebsiteSuccess(
        await addWorkspaceMember(
          owner,
          rawAdmin,
          WorkspaceRole.ADMIN,
        ),
      );

      expectWebsiteSuccess(
        await addWorkspaceMember(
          owner,
          rawDeveloper,
          WorkspaceRole.DEVELOPER,
        ),
      );

      expectWebsiteSuccess(
        await addWorkspaceMember(
          owner,
          rawViewer,
          WorkspaceRole.VIEWER,
        ),
      );

      return {
        owner,

        admin:
          inWorkspace(
            rawAdmin,
            owner.workspaceId,
          ),

        developer:
          inWorkspace(
            rawDeveloper,
            owner.workspaceId,
          ),

        viewer:
          inWorkspace(
            rawViewer,
            owner.workspaceId,
          ),
      };
    }

    it(
      'allows OWNER, ADMIN, and DEVELOPER to create and update websites',
      async () => {
        const matrix =
          await createRoleMatrix();

        for (
          const actor
          of [
            matrix.owner,
            matrix.admin,
            matrix.developer,
          ]
        ) {
          const website =
            await createWebsite(
              actor,
            );

          const updateResponse =
            await updateWebsite(
              actor,
              website.id,
              {
                name:
                  `Updated by ${actor.userId}`,
              },
            );

          expect(
            updateResponse.status,
          ).toBe(200);

          expectWebsiteSuccess(
            await disableWebsite(
              actor,
              website.id,
            ),
          );

          expectWebsiteSuccess(
            await enableWebsite(
              actor,
              website.id,
            ),
          );
        }
      },
    );

    it(
      'allows OWNER, ADMIN, and DEVELOPER to connect and disconnect websites',
      async () => {
        const matrix =
          await createRoleMatrix();

        for (
          const actor
          of [
            matrix.owner,
            matrix.admin,
            matrix.developer,
          ]
        ) {
          const application =
            await createApplication(
              actor,
            );

          const website =
            await createWebsite(
              actor,
            );

          expectWebsiteSuccess(
            await connectWebsite(
              actor,
              website.id,
              application.id,
            ),
          );

          expectWebsiteSuccess(
            await disconnectWebsite(
              actor,
              website.id,
            ),
          );
        }
      },
    );

    it(
      'allows VIEWER to read but prevents website mutations',
      async () => {
        const matrix =
          await createRoleMatrix();

        const website =
          await createWebsite(
            matrix.owner,
          );

        expect(
          (
            await listWebsites(
              matrix.viewer,
            )
          ).status,
        ).toBe(200);

        expect(
          (
            await getWebsite(
              matrix.viewer,
              website.id,
            )
          ).status,
        ).toBe(200);

        const createResponse =
          await matrix.viewer.agent
            .post(
              websiteRoutes.root(
                matrix.viewer.workspaceId,
              ),
            )
            .set(
              'Authorization',
              `Bearer ${matrix.viewer.accessToken}`,
            )
            .send({
              name:
                'Viewer Website',

              domain:
                'viewer.example.test',
            });

        expect(
          createResponse.status,
        ).toBe(403);

        expect(
          (
            await updateWebsite(
              matrix.viewer,
              website.id,
              {
                name:
                  'Viewer Update',
              },
            )
          ).status,
        ).toBe(403);

        expect(
          (
            await disableWebsite(
              matrix.viewer,
              website.id,
            )
          ).status,
        ).toBe(403);

        expect(
          (
            await archiveWebsite(
              matrix.viewer,
              website.id,
            )
          ).status,
        ).toBe(403);

        expect(
          (
            await rotateWebsiteKey(
              matrix.viewer,
              website.id,
            )
          ).status,
        ).toBe(403);
      },
    );

    it(
      'allows OWNER and ADMIN to archive, restore, and rotate keys',
      async () => {
        const matrix =
          await createRoleMatrix();

        for (
          const actor
          of [
            matrix.owner,
            matrix.admin,
          ]
        ) {
          const website =
            await createWebsite(
              actor,
            );

          expectWebsiteSuccess(
            await rotateWebsiteKey(
              actor,
              website.id,
            ),
          );

          expectWebsiteSuccess(
            await archiveWebsite(
              actor,
              website.id,
            ),
          );

          expectWebsiteSuccess(
            await restoreWebsite(
              actor,
              website.id,
            ),
          );
        }
      },
    );

    it(
      'prevents DEVELOPER from archive, restore, and key rotation',
      async () => {
        const matrix =
          await createRoleMatrix();

        const website =
          await createWebsite(
            matrix.developer,
          );

        expect(
          (
            await archiveWebsite(
              matrix.developer,
              website.id,
            )
          ).status,
        ).toBe(403);

        expect(
          (
            await restoreWebsite(
              matrix.developer,
              website.id,
            )
          ).status,
        ).toBe(403);

        expect(
          (
            await rotateWebsiteKey(
              matrix.developer,
              website.id,
            )
          ).status,
        ).toBe(403);
      },
    );

    it(
      'prevents outsider and anonymous access',
      async () => {
        const matrix =
          await createRoleMatrix();

        const website =
          await createWebsite(
            matrix.owner,
          );

        const outsider =
          await registerWorkspaceTestUser(
            app,
            prisma,
          );

        const outsiderResponse =
          await outsider.agent
            .get(
              websiteRoutes.details(
                matrix.owner.workspaceId,
                website.id,
              ),
            )
            .set(
              'Authorization',
              `Bearer ${outsider.accessToken}`,
            );

        expectAccessDenied(
          outsiderResponse,
        );

        const anonymousResponse =
          await request(
            app.getHttpServer(),
          ).get(
            websiteRoutes.root(
              matrix.owner.workspaceId,
            ),
          );

        expect(
          anonymousResponse.status,
        ).toBe(401);
      },
    );
  },
);
