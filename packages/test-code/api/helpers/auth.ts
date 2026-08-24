import { buildLoginPayload, buildRegisterPayload, TEST_ROUTES, type TestUserInput } from './contracts';
import type { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';

export interface RegisteredTestUser extends TestUserInput {
  registerResponse: Response;
}

export function createTestUser(overrides: Partial<TestUserInput> = {}): TestUserInput {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    name: overrides.name ?? 'E2E Test User',
    email: overrides.email ?? `e2e-${unique}@example.test`,
    password: overrides.password ?? 'StrongE2EPassword123!',
    workspaceName: overrides.workspaceName ?? `E2E Workspace ${unique}`,
  };
}

export function createAgent(app: INestApplication): ReturnType<typeof request.agent> {
  return request.agent(app.getHttpServer());
}

export async function registerUser(agent: ReturnType<typeof request.agent>, user: TestUserInput): Promise<Response> {
  return agent.post(TEST_ROUTES.auth.register).send(buildRegisterPayload(user));
}

export async function loginUser(agent: ReturnType<typeof request.agent>, user: Pick<TestUserInput, 'email' | 'password'>): Promise<Response> {
  return agent.post(TEST_ROUTES.auth.login).send(buildLoginPayload(user));
}

export function withBearer(token: string): {
  Authorization: string;
} {
  return {
    Authorization: `Bearer ${token}`,
  };
}
