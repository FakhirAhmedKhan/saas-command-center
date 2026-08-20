import type { SuggestedWorkspace } from '@command-center/shared-types';

export function suggestWorkspace(repositoryName: string, repositoryDescription: string | null, rootPackageDescription?: string | null): SuggestedWorkspace {
  const name = titleCaseFromSlug(repositoryName);

  const slug = normalizeSlug(repositoryName);

  return {
    name,
    slug,
    description: repositoryDescription?.trim() || rootPackageDescription?.trim() || null,
  };
}

function titleCaseFromSlug(value: string): string {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
