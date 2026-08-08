import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SeedUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  workspaceId: string;
  accessToken: string;
  storageStatePath: string;
}

export interface FullStackState {
  runId: string;
  apiUrl: string;
  webUrl: string;
  trackingOrigin: string;
  owner: SeedUser;
  admin: SeedUser;
  developer: SeedUser;
  viewer: SeedUser;
  baselineApplication: {
    id: string;
    name: string;
    slug: string;
  };
  baselineWebsite: {
    id: string;
    name: string;
    domain: string;
    trackingKey: string;
  };
}

export function fullStackStateDirectory(): string {
  return resolve(process.cwd(), 'e2e/full-stack/.state');
}

export function fullStackStatePath(): string {
  return resolve(fullStackStateDirectory(), 'seed.json');
}

export function readFullStackState(): FullStackState {
  return JSON.parse(readFileSync(fullStackStatePath(), 'utf8')) as FullStackState;
}
