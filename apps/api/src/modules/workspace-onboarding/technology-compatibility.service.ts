import type { WorkspaceApplicationType, WorkspacePlatform, WorkspaceTechnology } from '@command-center/shared-types';
import { BadRequestException, Injectable } from '@nestjs/common';

const technologyPlatforms: Record<WorkspaceTechnology, WorkspacePlatform[]> = {
  NEXT_JS: ['WEB'],
  TYPESCRIPT: ['WEB', 'WINDOWS', 'MACOS', 'LINUX'],
  KOTLIN: ['ANDROID'],
  JETPACK_COMPOSE: ['ANDROID'],
  SWIFT: ['IOS'],
  SWIFTUI: ['IOS'],
  REACT_NATIVE: ['ANDROID', 'IOS'],
  FLUTTER: ['ANDROID', 'IOS'],
  TAURI: ['WINDOWS', 'MACOS', 'LINUX'],
  ELECTRON: ['WINDOWS', 'MACOS', 'LINUX'],
  NEST_JS: [],
  POSTGRESQL: [],
  REDIS: [],
};
const applicationPlatforms: Record<WorkspaceApplicationType, WorkspacePlatform[]> = {
  WEB: ['WEB'],
  MOBILE: ['ANDROID', 'IOS'],
  DESKTOP: ['WINDOWS', 'MACOS', 'LINUX'],
};

@Injectable()
export class TechnologyCompatibilityService {
  assertApplication(type: WorkspaceApplicationType, platforms: WorkspacePlatform[], stack: WorkspaceTechnology[]): void {
    const allowedPlatforms = applicationPlatforms[type];

    for (const platform of platforms) {
      if (!allowedPlatforms.includes(platform)) {
        throw new BadRequestException(`${platform} is not compatible with ${type}`);
      }
    }

    for (const technology of stack) {
      const supportedPlatforms = technologyPlatforms[technology];

      if (supportedPlatforms.length > 0 && !platforms.some((platform) => supportedPlatforms.includes(platform))) {
        throw new BadRequestException(`${technology} is not compatible with the selected platforms`);
      }
    }

    this.assertRequiredPairs(stack);
  }

  private assertRequiredPairs(stack: WorkspaceTechnology[]): void {
    const requirements: Partial<Record<WorkspaceTechnology, WorkspaceTechnology>> = {
      JETPACK_COMPOSE: 'KOTLIN',
      SWIFTUI: 'SWIFT',
    };

    for (const technology of stack) {
      const required = requirements[technology];

      if (required && !stack.includes(required)) {
        throw new BadRequestException(`${technology} requires ${required}`);
      }
    }
  }
}
