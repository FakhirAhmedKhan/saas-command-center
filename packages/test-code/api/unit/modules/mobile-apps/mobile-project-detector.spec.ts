import { detectMobileProjects, type MobileRepositorySnapshot } from 'src/modules/mobile-apps/services/mobile-project-detector';

function snapshot(paths: string[], files: Record<string, string>): MobileRepositorySnapshot {
  return {
    paths,
    files,
    truncated: false,
  };
}

describe('MobileProjectDetector', () => {
  it('detects native Android', () => {
    const result = detectMobileProjects(
      snapshot(
        ['settings.gradle.kts', 'app/build.gradle.kts', 'app/src/main/AndroidManifest.xml'],

        {
          'settings.gradle.kts': 'rootProject.name = "AndroidApp"',

          'app/build.gradle.kts': `
                  android {
                    namespace = "com.example.android"

                    defaultConfig {
                      applicationId = "com.example.android"
                      minSdk = 26
                      targetSdk = 36
                      versionCode = 815
                      versionName = "6.14.0"
                    }
                  }
                `,

          'app/src/main/AndroidManifest.xml': '<manifest package="com.example.android" />',
        },
      ),
    );

    expect(result).toHaveLength(1);

    expect(result[0]).toMatchObject({
      platform: 'ANDROID',

      framework: 'ANDROID_NATIVE',

      packageId: 'com.example.android',

      minOsVersion: '26',

      targetOsVersion: '36',

      currentVersion: '6.14.0',

      currentBuildNumber: '815',
    });
  });

  it('detects Flutter', () => {
    const result = detectMobileProjects(
      snapshot(
        ['pubspec.yaml', 'lib/main.dart', 'android/app/build.gradle', 'ios/Runner.xcodeproj/project.pbxproj'],

        {
          'pubspec.yaml': 'name: mobile\nversion: 2.3.0+99',

          'android/app/build.gradle': `
                  defaultConfig {
                    applicationId "com.example.flutter"
                    minSdkVersion 24
                    targetSdkVersion 35
                  }
                `,

          'ios/Runner.xcodeproj/project.pbxproj': `
                  PRODUCT_BUNDLE_IDENTIFIER = com.example.flutter.ios;
                  IPHONEOS_DEPLOYMENT_TARGET = 16.0;
                  MARKETING_VERSION = 2.3.0;
                  CURRENT_PROJECT_VERSION = 99;
                `,
        },
      ),
    );

    expect(result[0]).toMatchObject({
      platform: 'CROSS_PLATFORM',

      framework: 'FLUTTER',

      packageId: 'com.example.flutter',

      bundleId: 'com.example.flutter.ios',

      currentVersion: '2.3.0',

      currentBuildNumber: '99',
    });
  });

  it('detects React Native', () => {
    const result = detectMobileProjects(
      snapshot(
        ['package.json', 'metro.config.js', 'android/settings.gradle', 'ios/App.xcodeproj/project.pbxproj'],

        {
          'package.json': JSON.stringify({
            version: '3.1.0',

            dependencies: {
              'react-native': '0.82.0',
            },
          }),

          'metro.config.js': 'module.exports = {};',

          'android/settings.gradle': 'rootProject.name="RNApp"',

          'ios/App.xcodeproj/project.pbxproj': 'PRODUCT_BUNDLE_IDENTIFIER = com.example.rn;',
        },
      ),
    );

    expect(result.some((project) => project.framework === 'REACT_NATIVE')).toBe(true);
  });

  it('detects Kotlin Multiplatform', () => {
    const result = detectMobileProjects(
      snapshot(
        ['settings.gradle.kts', 'build.gradle.kts', 'shared/src/commonMain/kotlin/App.kt'],

        {
          'settings.gradle.kts': 'rootProject.name = "KMP"',

          'build.gradle.kts': `
                  plugins {
                    kotlin("multiplatform")
                  }

                  kotlin {
                    androidTarget()
                    iosArm64()
                  }
                `,
        },
      ),
    );

    expect(result.some((project) => project.framework === 'KMP')).toBe(true);
  });

  it('detects native iOS', () => {
    const result = detectMobileProjects(
      snapshot(
        ['Karwa.xcodeproj/project.pbxproj', 'Karwa/Info.plist', 'Podfile'],

        {
          'Karwa.xcodeproj/project.pbxproj': `
                  PRODUCT_BUNDLE_IDENTIFIER = com.karwa.ios;
                  IPHONEOS_DEPLOYMENT_TARGET = 16.0;
                  MARKETING_VERSION = 4.8.0;
                  CURRENT_PROJECT_VERSION = 412;
                `,

          'Karwa/Info.plist': '<plist></plist>',

          Podfile: "platform :ios, '16.0'",
        },
      ),
    );

    expect(result[0]).toMatchObject({
      platform: 'IOS',

      framework: 'IOS_NATIVE',

      bundleId: 'com.karwa.ios',

      minOsVersion: '16.0',

      currentVersion: '4.8.0',

      currentBuildNumber: '412',
    });
  });

  it('returns empty result for non-mobile repository', () => {
    const result = detectMobileProjects(
      snapshot(
        ['package.json', 'src/server.ts'],

        {
          'package.json': JSON.stringify({
            dependencies: {
              '@nestjs/common': '^11.0.0',
            },
          }),
        },
      ),
    );

    expect(result).toEqual([]);
  });
});
