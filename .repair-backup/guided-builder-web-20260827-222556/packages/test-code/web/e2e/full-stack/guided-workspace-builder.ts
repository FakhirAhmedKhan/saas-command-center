import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface GuidedFlowOptions {
  name: string;
  applications: Array<'Web' | 'Mobile' | 'Desktop'>;
  mobilePlatforms?: Array<'Android' | 'iOS'>;
  desktopPlatforms?: Array<'Windows' | 'macOS' | 'Linux'>;
  repositories?: 'No repositories' | 'Connect later' | 'Connect now';
}

async function choose(page: Page, prompt: string, labels: string[]) {
  await expect(
    page.getByRole('heading', {
      name: prompt,
    }),
  ).toBeVisible();

  for (const label of labels) {
    await page
      .getByRole('button', {
        name: label,
        exact: true,
      })
      .click();
  }

  await page
    .getByRole('button', {
      name: 'Continue',
      exact: true,
    })
    .click();
}

async function text(page: Page, prompt: string, value: string) {
  await page
    .getByRole('textbox', {
      name: prompt,
    })
    .fill(value);

  await page
    .getByRole('button', {
      name: 'Continue',
      exact: true,
    })
    .click();
}

export async function answerGuidedFlow(page: Page, options: GuidedFlowOptions) {
  await text(page, 'What are you building?', `${options.name} product`);

  await text(page, 'What should the workspace be called?', options.name);

  await choose(page, 'What type of product is it?', ['Productivity SaaS']);

  await choose(page, 'Who will use the product?', ['Consumers']);

  await choose(page, 'Which applications do you need?', options.applications);

  if (options.applications.includes('Mobile')) {
    await choose(page, 'Which mobile platforms do you need?', options.mobilePlatforms ?? ['Android']);
  }

  if (options.applications.includes('Desktop')) {
    await choose(page, 'Which desktop platforms do you need?', options.desktopPlatforms ?? ['Windows']);
  }

  await choose(page, 'Which core features are required?', ['Dashboard']);

  await choose(page, 'Does the product require user accounts?', ['Yes']);

  await choose(page, 'Do repositories already exist?', [options.repositories ?? 'Connect later']);

  await choose(page, 'Which environments are required?', ['Development', 'Production']);

  await choose(page, 'Which engineering systems are required?', ['CI/CD', 'Monitoring', 'Security']);
}

export async function generateAndConfirm(page: Page) {
  await page
    .getByRole('button', {
      name: 'Generate guided recommendations',
    })
    .click();

  await expect(
    page.getByRole('heading', {
      name: 'Review guided recommendations',
    }),
  ).toBeVisible();

  await page
    .getByRole('button', {
      name: 'Save and continue',
    })
    .click();

  await page
    .getByRole('button', {
      name: 'Confirm and create',
    })
    .click();

  await expect(page).toHaveURL(/\/workspaces\/[a-z0-9-]+$/);
}
