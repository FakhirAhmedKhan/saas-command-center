import { DesktopProjectDetector, type DesktopRepositorySnapshot } from 'src/modules/desktop-apps/services/desktop-project-detector';

function snapshot(paths: string[], files: Record<string, string>): DesktopRepositorySnapshot {
  return {
    repositoryId: '11111111-1111-4111-8111-111111111111',
    repositoryFullName: 'command-center/desktop-fixture',
    branch: 'main',
    truncated: false,
    paths,
    files,
  };
}

describe('DesktopProjectDetector', () => {
  const detector = new DesktopProjectDetector();

  it('detects Electron', () => {
    const result = detector.detect(
      snapshot(['package.json'], {
        'package.json': JSON.stringify({
          name: 'electron-demo',
          version: '1.4.0',
          main: 'dist/main.js',
          devDependencies: {
            electron: '^40.0.0',
            'electron-builder': '^26.0.0',
          },
          build: {
            win: {
              target: ['nsis'],
            },
            mac: {
              target: ['dmg'],
            },
          },
        }),
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'ELECTRON',
      platform: 'CROSS_PLATFORM',
      packageName: 'electron-demo',
      version: '1.4.0',
      confidence: 'HIGH',
    });
  });

  it('detects Tauri', () => {
    const result = detector.detect(
      snapshot(['package.json', 'src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json'], {
        'src-tauri/Cargo.toml': `
[package]
name = "tauri-demo"
version = "2.3.0"

[dependencies]
tauri = "2"
`,
        'src-tauri/tauri.conf.json': JSON.stringify({
          productName: 'Tauri Demo',
          version: '2.3.0',
          bundle: {
            active: true,
            targets: 'all',
          },
        }),
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'TAURI',
      packageName: 'Tauri Demo',
      version: '2.3.0',
      confidence: 'HIGH',
    });
  });

  it('detects WPF .NET', () => {
    const result = detector.detect(
      snapshot(['src/Desktop/Desktop.csproj'], {
        'src/Desktop/Desktop.csproj': `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    <Version>3.0.1</Version>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
  </PropertyGroup>
</Project>
`,
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'DOTNET',
      platform: 'WINDOWS',
      architecture: 'X64',
      packageName: 'Desktop',
      version: '3.0.1',
    });
  });

  it('detects WinUI .NET', () => {
    const result = detector.detect(
      snapshot(['WindowsApp/WindowsApp.csproj'], {
        'WindowsApp/WindowsApp.csproj': `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0-windows10.0.22621.0</TargetFramework>
    <TargetPlatformMinVersion>10.0.19041.0</TargetPlatformMinVersion>
    <RuntimeIdentifiers>win-x64;win-arm64</RuntimeIdentifiers>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.WindowsAppSDK" Version="1.8.0" />
  </ItemGroup>
</Project>
`,
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'DOTNET',
      platform: 'WINDOWS',
      architecture: 'UNIVERSAL',
      minimumOsVersion: '10.0.19041.0',
    });
  });

  it('detects Qt with CMake', () => {
    const result = detector.detect(
      snapshot(['desktop/CMakeLists.txt'], {
        'desktop/CMakeLists.txt': `
cmake_minimum_required(VERSION 3.24)
project(CommandCenterDesktop)
find_package(Qt6 REQUIRED COMPONENTS Widgets)
qt_add_executable(command-center main.cpp)
`,
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'QT',
      packageName: 'command-center',
    });
  });

  it('detects JavaFX', () => {
    const result = detector.detect(
      snapshot(['desktop/pom.xml'], {
        'desktop/pom.xml': `
<project>
  <artifactId>desktop-javafx</artifactId>
  <version>5.0.0</version>
  <dependencies>
    <dependency>
      <groupId>org.openjfx</groupId>
      <artifactId>javafx-controls</artifactId>
    </dependency>
  </dependencies>
</project>
`,
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'JAVA',
      platform: 'CROSS_PLATFORM',
      packageName: 'desktop-javafx',
      version: '5.0.0',
    });
  });

  it('detects native macOS', () => {
    const path = 'MacApp/MacApp.xcodeproj/project.pbxproj';

    const result = detector.detect(
      snapshot([path], {
        [path]: `
SDKROOT = macosx;
MACOSX_DEPLOYMENT_TARGET = 14.0;
PRODUCT_BUNDLE_IDENTIFIER = com.commandcenter.mac;
MARKETING_VERSION = 1.7.0;
CURRENT_PROJECT_VERSION = 170;
`,
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'NATIVE_MACOS',
      platform: 'MACOS',
      packageName: 'com.commandcenter.mac',
      version: '1.7.0',
      buildNumber: '170',
      minimumOsVersion: '14.0',
    });
  });

  it('does not classify an ordinary Node web repository as desktop', () => {
    const result = detector.detect(
      snapshot(['package.json'], {
        'package.json': JSON.stringify({
          name: 'website',
          dependencies: {
            next: '^16.0.0',
            react: '^19.0.0',
          },
        }),
      }),
    );

    expect(result.primary).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('returns all desktop projects in a monorepo ordered by confidence', () => {
    const result = detector.detect(
      snapshot(['apps/electron/package.json', 'apps/tauri/src-tauri/Cargo.toml', 'apps/tauri/src-tauri/tauri.conf.json'], {
        'apps/electron/package.json': JSON.stringify({
          name: 'electron-app',
          devDependencies: {
            electron: '^40.0.0',
          },
        }),
        'apps/tauri/src-tauri/Cargo.toml': `
[package]
name = "tauri-app"
version = "1.0.0"
`,
        'apps/tauri/src-tauri/tauri.conf.json': JSON.stringify({
          productName: 'Tauri App',
        }),
      }),
    );

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map((candidate) => candidate.framework)).toEqual(expect.arrayContaining(['ELECTRON', 'TAURI']));
  });

  it('adds a warning when repository metadata is truncated', () => {
    const source = snapshot(['package.json'], {
      'package.json': JSON.stringify({
        name: 'electron-app',
        devDependencies: {
          electron: '^40.0.0',
        },
      }),
    });

    source.truncated = true;

    const result = detector.detect(source);

    expect(result.primary?.warnings.join(' ')).toContain('truncated');
  });
});
