import { DesktopDependencyHealthService } from 'src/modules/desktop-apps/services/desktop-dependency-health.service';
import type { DesktopRepositoryMetadataSnapshot } from 'src/modules/desktop-apps/services/desktop-repository-metadata.service';
import { DesktopSecurityService } from 'src/modules/desktop-apps/services/desktop-security.service';

function snapshot(files: Record<string, string>): DesktopRepositoryMetadataSnapshot {
  return {
    repositoryId: '11111111-1111-4111-8111-111111111111',
    repositoryFullName: 'command-center/desktop',
    branch: 'main',
    paths: Object.keys(files),
    files,
    truncated: false,
  };
}

describe('Desktop dependency/security parsers', () => {
  const dependencies = new DesktopDependencyHealthService({} as never, {} as never, {} as never);
  const security = new DesktopSecurityService({} as never, {} as never, {} as never, dependencies);

  it('parses npm dependencies', () => {
    const parsed = dependencies.parse(
      snapshot({
        'package.json': JSON.stringify({
          dependencies: {
            electron: '31.2.0',
            react: '^19.1.0',
          },
        }),
      }),
    );

    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ecosystem: 'NPM',
          name: 'electron',
          currentVersion: '31.2.0',
        }),
        expect.objectContaining({
          ecosystem: 'NPM',
          name: 'react',
        }),
      ]),
    );
  });

  it('parses Cargo dependencies', () => {
    const parsed = dependencies.parse(
      snapshot({
        'src-tauri/Cargo.toml': `
[package]
name = "desktop"

[dependencies]
tauri = "2.8.0"
serde = { version = "1.0", features = ["derive"] }
`,
      }),
    );

    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ecosystem: 'CARGO',
          name: 'tauri',
          currentVersion: '2.8.0',
        }),
        expect.objectContaining({
          ecosystem: 'CARGO',
          name: 'serde',
          currentVersion: '1.0',
        }),
      ]),
    );
  });

  it('parses NuGet PackageReference entries', () => {
    const parsed = dependencies.parse(
      snapshot({
        'Desktop/Desktop.csproj': `
<Project>
  <ItemGroup>
    <PackageReference Include="Avalonia" Version="11.3.0" />
  </ItemGroup>
</Project>
`,
      }),
    );

    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ecosystem: 'NUGET',
          name: 'Avalonia',
          currentVersion: '11.3.0',
        }),
      ]),
    );
  });

  it('handles malformed package json safely', () => {
    expect(dependencies.parse(snapshot({ 'package.json': '{bad json' }))).toEqual([]);
  });

  it('extracts vulnerability metadata from controlled audit JSON', () => {
    const result = dependencies.vulnerabilities(
      snapshot({
        'npm-audit.json': JSON.stringify({
          vulnerabilities: [
            {
              name: 'electron',
              id: 'GHSA-example',
              severity: 'critical',
            },
          ],
        }),
      }),
    );

    expect(result).toEqual([
      expect.objectContaining({
        packageName: 'electron',
        advisoryIds: ['GHSA-example'],
        severity: 'CRITICAL',
      }),
    ]);
  });

  it('detects signing and notarization markers', () => {
    const findings = security.evaluate(
      snapshot({
        'electron-builder.yml': `
win:
  certificateSubjectName: Command Center LLC
mac:
  identity: Developer ID Application
  hardenedRuntime: true
afterSign: scripts/notarize.js
`,
      }),
      'ELECTRON',
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'WINDOWS_SIGNING',
          status: 'PASS',
        }),
        expect.objectContaining({
          type: 'MACOS_SIGNING',
          status: 'PASS',
        }),
        expect.objectContaining({
          type: 'MACOS_NOTARIZATION',
          status: 'PASS',
        }),
      ]),
    );
  });
});
