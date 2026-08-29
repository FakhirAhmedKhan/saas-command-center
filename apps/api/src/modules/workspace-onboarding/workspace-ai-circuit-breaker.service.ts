import type { TypedConfigService } from '../../config/runtime-config';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceAiCircuitBreakerService {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(
    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  assertAvailable(now = Date.now()): void {
    if (this.openedAt === null) {
      return;
    }

    const resetMs = this.config.get('WORKSPACE_ONBOARDING_AI_CIRCUIT_RESET_MS', {
      infer: true,
    });

    if (now - this.openedAt >= resetMs) {
      this.failures = 0;
      this.openedAt = null;
      return;
    }

    throw new ServiceUnavailableException('Workspace AI provider circuit is open');
  }

  success(): void {
    this.failures = 0;
    this.openedAt = null;
  }

  failure(now = Date.now()): void {
    this.failures += 1;

    const threshold = this.config.get('WORKSPACE_ONBOARDING_AI_CIRCUIT_FAILURE_THRESHOLD', {
      infer: true,
    });

    if (this.failures >= threshold) {
      this.openedAt = now;
    }
  }
}
