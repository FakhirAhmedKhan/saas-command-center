import type { MobileAnalysisProvider } from 'src/modules/mobile-apps/analysis/mobile-analysis-provider.interface';

class FakeMobileAiProvider implements MobileAnalysisProvider {
  inputs: Array<{
    system: string;
    prompt: string;
  }> = [];

  fail = false;

  async analyze(input: { system: string; prompt: string }) {
    this.inputs.push(input);

    if (this.fail) {
      throw new Error('fake AI failed');
    }

    return 'Build failure correlates with two failed UI tests. ' + 'The available evidence does not prove causation.';
  }
}

it('build analysis receives build/test context', async () => {
  const response = await owner.agent
    .post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/analysis`)
    .set(withBearer(owner.accessToken))
    .send({
      action: 'BUILD_FAILURE',

      buildId,
    })
    .expect(201);

  expect(response.body.evidence.some((item: { type: string }) => item.type === 'BUILD')).toBe(true);

  expect(fake.inputs[0]!.prompt).toContain(buildId);

  expect(fake.inputs[0]!.prompt).toContain('failed');
});

it('telemetry credentials are excluded from AI prompt', async () => {
  await prisma.mobileTelemetryIntegration.create({
    data: {
      workspaceId,
      mobileAppId,

      provider: 'SENTRY',

      status: 'CONNECTED',

      externalProjectId: 'mobile',

      encryptedConfig: 'THIS_MUST_NEVER_ENTER_AI_CONTEXT',
    },
  });

  await owner.agent
    .post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/analysis`)
    .set(withBearer(owner.accessToken))
    .send({
      action: 'RELEASE_HEALTH',
    })
    .expect(201);

  expect(fake.inputs[0]!.prompt).not.toContain('THIS_MUST_NEVER_ENTER_AI_CONTEXT');

  expect(fake.inputs[0]!.prompt).not.toContain('encryptedConfig');
});

it('provider failure returns safe error', async () => {
  fake.fail = true;

  const response = await owner.agent.post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/analysis`).set(withBearer(owner.accessToken)).send({
    action: 'RELEASE_HEALTH',
  });

  expect(response.status).toBe(502);

  expect(JSON.stringify(response.body)).not.toContain('fake AI failed');
});
