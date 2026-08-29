import { PayloadTooLargeException, BadRequestException, Injectable } from '@nestjs/common';

const forbiddenKeyPattern = /^(?:access[_-]?token|refresh[_-]?token|client[_-]?secret|webhook[_-]?secret|private[_-]?key|password)$/i;

@Injectable()
export class WorkspaceOnboardingPayloadService {
  byteLength(value: unknown): number {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  }

  assertWithinLimit(value: unknown, maximumBytes: number, label: string): void {
    const bytes = this.byteLength(value);

    if (bytes > maximumBytes) {
      throw new PayloadTooLargeException(`${label} exceeds the ${maximumBytes}-byte limit`);
    }
  }

  assertNoForbiddenKeys(value: unknown): void {
    const stack: unknown[] = [value];

    while (stack.length > 0) {
      const current = stack.pop();

      if (!current || typeof current !== 'object') continue;

      if (Array.isArray(current)) {
        for (const child of current as unknown[]) {
          stack.push(child);
        }
        continue;
      }

      for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
        if (forbiddenKeyPattern.test(key)) {
          throw new BadRequestException(`Sensitive field "${key}" is not allowed in onboarding data`);
        }

        stack.push(child);
      }
    }
  }

  validateAnswers(value: unknown, maximumBytes: number): void {
    this.assertWithinLimit(value, maximumBytes, 'Answers');
    this.assertNoForbiddenKeys(value);
  }

  validateBlueprint(value: unknown, maximumBytes: number): void {
    this.assertWithinLimit(value, maximumBytes, 'Blueprint');
    this.assertNoForbiddenKeys(value);
  }
}
