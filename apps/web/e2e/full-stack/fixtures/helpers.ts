import type { FullStackState, SeedUser } from './state';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export async function loginThroughUi(page: Page, user: SeedUser): Promise<void> {
  await page.goto('/login');

  await page.getByLabel('Email address').fill(user.email);

  await page.getByLabel('Password').fill(user.password);

  await page
    .getByRole('button', {
      name: 'Sign in',
    })
    .click();

  await expect(page).toHaveURL(/\/dashboard$/);

  await expect(page.getByText(user.email)).toBeVisible();
}

export function uniqueValue(prefix: string, runId: string): string {
  return `${prefix}-${runId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function authorizedApiRequest(
  request: APIRequestContext,
  state: FullStackState,
  token: string,
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    data?: unknown;
  } = {},
) {
  return request.fetch(`${state.apiUrl}${path}`, {
    method: options.method ?? 'GET',
    data: options.data,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function expectMetric(page: Page, label: string, value: string | number): Promise<void> {
  const labelElement = page
    .getByText(label, {
      exact: true,
    })
    .first();

  await expect(labelElement).toBeVisible();

  await expect(
    labelElement.locator('..').getByText(String(value), {
      exact: true,
    }),
  ).toBeVisible();
}

export function trackerIdentifier(prefix: string): string {
  const random = `${Date.now()}${Math.random().toString(36).slice(2)}`.replace(/[^a-zA-Z0-9_-]/g, '').padEnd(20, 'x');

  return `${prefix}_${random}`.slice(0, 80);
}
