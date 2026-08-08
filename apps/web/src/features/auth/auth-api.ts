import { apiRequest } from '../lib/api/http-client';
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from './auth.types';

function validateSession(session: AuthSession): AuthSession {
  if (typeof session.accessToken !== 'string' || session.accessToken.length === 0) {
    throw new Error('Authentication response is missing accessToken.');
  }

  if (
    !session.user ||
    typeof session.user.id !== 'string' ||
    typeof session.user.email !== 'string'
  ) {
    throw new Error('Authentication response is missing a valid user.');
  }

  return session;
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: input,

    skipAuthentication: true,

    skipRefresh: true,
  });

  return validateSession(session);
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/register', {
    method: 'POST',
    body: input,

    skipAuthentication: true,

    skipRefresh: true,
  });

  return validateSession(session);
}

export async function restoreSession(): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/refresh', {
    method: 'POST',

    skipAuthentication: true,

    skipRefresh: true,
  });

  return validateSession(session);
}

export async function logout(): Promise<void> {
  await apiRequest<{
    success: true;
  }>('/auth/logout', {
    method: 'POST',

    skipAuthentication: true,

    skipRefresh: true,
  });
}

export async function logoutAll(): Promise<void> {
  await apiRequest<{
    success: true;
  }>('/auth/logout-all', {
    method: 'POST',
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me');
}
