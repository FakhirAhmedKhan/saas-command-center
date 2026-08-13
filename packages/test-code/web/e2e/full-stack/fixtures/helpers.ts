import type { FullStackState, SeedUser } from './state';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export async function loginThroughUi(page: Page, user: SeedUser): Promise<void> {
  await page.goto('/login');

  await page.getByLabel('Email').fill(user.email);

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

/**
 * Asserts the value rendered by a `Metric` card.
 *
 * Both Metric components (tracking-status-panel.tsx and analytics-engine-panel.tsx)
 * render the same shape:
 *
 *   <div>                        <- card
 *     <div class="flex ...">     <- row: label + optional icon
 *       <span>{label}</span>
 *       <span>{icon}</span>
 *     </div>
 *     <p>{value}</p>             <- value
 *   </div>
 *
 * The label's immediate next sibling is the icon, so the value is resolved by
 * scoping to the card and reading its value paragraph. Matching the label via a
 * span also avoids colliding with headings that reuse the same text (the
 * installation page has a "Custom events" <h2>).
 */
export async function expectMetric(page: Page, label: string, value: string | number): Promise<void> {
  const labelElement = page.locator('span', {
    hasText: new RegExp(`^${escapeForRegExp(label)}$`),
  });

  await expect(labelElement).toHaveCount(1);

  await expect(labelElement).toBeVisible();

  const valueElement = labelElement.locator('xpath=../following-sibling::p[1]');

  await expect(valueElement).toHaveText(String(value));
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function trackerIdentifier(prefix: string): string {
  const random = `${Date.now()}${Math.random().toString(36).slice(2)}`.replace(/[^a-zA-Z0-9_-]/g, '').padEnd(20, 'x');

  return `${prefix}_${random}`.slice(0, 80);
}
