import { detectPackageManager } from 'src/modules/repositories/services/analyzer/package-manager-detector';

describe('detectPackageManager', () => {
  it('detects pnpm from pnpm-lock.yaml', () => {
    expect(detectPackageManager(new Set(['pnpm-lock.yaml']))).toBe('pnpm');
  });

  it('detects bun from bun.lock', () => {
    expect(detectPackageManager(new Set(['bun.lock']))).toBe('bun');
  });

  it('detects yarn from yarn.lock', () => {
    expect(detectPackageManager(new Set(['yarn.lock']))).toBe('yarn');
  });

  it('detects npm from package-lock.json', () => {
    expect(detectPackageManager(new Set(['package-lock.json']))).toBe('npm');
  });

  it('prefers pnpm over a stale package-lock.json when both lockfiles exist', () => {
    expect(detectPackageManager(new Set(['pnpm-lock.yaml', 'package-lock.json']))).toBe('pnpm');
  });

  it('prefers the packageManager field over lockfile presence', () => {
    expect(detectPackageManager(new Set(['package-lock.json']), 'pnpm@8.15.0')).toBe('pnpm');
  });

  it('returns unknown when no lockfile or packageManager field is present', () => {
    expect(detectPackageManager(new Set())).toBe('unknown');
  });
});
