import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { DesktopApplicationMetadataDto } from 'src/modules/desktop-apps/dto/desktop-app-foundation.dto';

describe('DesktopApplicationMetadataDto', () => {
  it('accepts valid Electron metadata', async () => {
    const dto = plainToInstance(DesktopApplicationMetadataDto, {
      platform: 'CROSS_PLATFORM',
      framework: 'ELECTRON',
      architecture: 'X64',
      packageName: 'com.commandcenter.desktop',
      currentVersion: '1.0.0',
      currentBuildNumber: '1',
      minimumOsVersion: 'Windows 10',
      updateChannel: 'stable',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid platform', async () => {
    const dto = plainToInstance(DesktopApplicationMetadataDto, {
      platform: 'ANDROID',
      framework: 'ELECTRON',
      architecture: 'X64',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'platform')).toBe(true);
  });

  it('rejects an invalid framework', async () => {
    const dto = plainToInstance(DesktopApplicationMetadataDto, {
      platform: 'WINDOWS',
      framework: 'FLUTTER',
      architecture: 'X64',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'framework')).toBe(true);
  });

  it('rejects an invalid architecture', async () => {
    const dto = plainToInstance(DesktopApplicationMetadataDto, {
      platform: 'WINDOWS',
      framework: 'DOTNET',
      architecture: 'POWERPC',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'architecture')).toBe(true);
  });

  it('rejects package names over 255 characters', async () => {
    const dto = plainToInstance(DesktopApplicationMetadataDto, {
      platform: 'WINDOWS',
      framework: 'DOTNET',
      architecture: 'X64',
      packageName: 'x'.repeat(256),
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'packageName')).toBe(true);
  });
});
