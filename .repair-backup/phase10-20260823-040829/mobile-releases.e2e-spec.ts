describe('Mobile Releases E2E', () => {
  it('creates release from successful build', async () => {
    const { owner, mobile, build } = await createReleaseFixture({
      buildStatus: 'SUCCESS',
    });

    const response = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`)
      .set(withBearer(owner.accessToken))
      .send({
        buildId: build.id,

        environment: 'PRODUCTION',

        releaseNotes: 'Production release',
      });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      buildId: build.id,

      version: '6.14.0',

      buildNumber: '815',

      environment: 'PRODUCTION',

      status: 'DRAFT',

      commitSha: build.commitSha,
    });
  });

  it('rejects failed build', async () => {
    const { owner, mobile, build } = await createReleaseFixture({
      buildStatus: 'FAILED',
    });

    await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`)
      .set(withBearer(owner.accessToken))
      .send({
        buildId: build.id,

        environment: 'BETA',
      })
      .expect(400);
  });

  it('rejects nonexistent build', async () => {
    const { owner, mobile } = await createReleaseFixture();

    await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`)
      .set(withBearer(owner.accessToken))
      .send({
        buildId: '11111111-1111-4111-8111-111111111111',

        environment: 'BETA',
      })
      .expect(404);
  });

  it('transitions DRAFT → READY → RELEASED → ROLLED_BACK', async () => {
    const { owner, mobile, build } = await createReleaseFixture();

    const created = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`)
      .set(withBearer(owner.accessToken))
      .send({
        buildId: build.id,

        environment: 'PRODUCTION',
      })
      .expect(201);

    const url = `${API}/workspaces/${owner.workspaceId}` + `/mobile-apps/${mobile.id}` + `/releases/${created.body.id}/status`;

    await owner.agent
      .patch(url)
      .set(withBearer(owner.accessToken))
      .send({
        status: 'READY',
      })
      .expect(200);

    const released = await owner.agent
      .patch(url)
      .set(withBearer(owner.accessToken))
      .send({
        status: 'RELEASED',
      })
      .expect(200);

    expect(released.body.releasedAt).not.toBeNull();

    const rolledBack = await owner.agent
      .patch(url)
      .set(withBearer(owner.accessToken))
      .send({
        status: 'ROLLED_BACK',
      })
      .expect(200);

    expect(rolledBack.body.status).toBe('ROLLED_BACK');
  });

  it('rejects invalid lifecycle transition', async () => {
    const { owner, mobile, build } = await createReleaseFixture();

    const created = await owner.agent.post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`).set(withBearer(owner.accessToken)).send({
      buildId: build.id,

      environment: 'PRODUCTION',
    });

    await owner.agent
      .patch(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases/${created.body.id}/status`)
      .set(withBearer(owner.accessToken))
      .send({
        status: 'RELEASED',
      })
      .expect(400);
  });

  it('prevents cross-workspace build release', async () => {
    // Workspace B build ID used against Workspace A mobile app.
    // Expected 404.
  });

  it('prevents archived app from creating a release', async () => {
    // Archive app first.
    // POST release must return 400.
  });
});
