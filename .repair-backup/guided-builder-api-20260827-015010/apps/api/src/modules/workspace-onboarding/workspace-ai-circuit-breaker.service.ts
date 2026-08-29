import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class WorkspaceAiCircuitBreakerService {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(private readonly config: TypedConfigService) {}

  assertAvailable(now = Date.now()): void {
    if (this.openedAt === null) return;

    if (now - this.openedAt >= this.config.workspaceOnboarding.aiCircuitResetMs) {
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

    if (this.failures >= this.config.workspaceOnboarding.aiCircuitFailureThreshold) {
      this.openedAt = now;
    }
  }
}
