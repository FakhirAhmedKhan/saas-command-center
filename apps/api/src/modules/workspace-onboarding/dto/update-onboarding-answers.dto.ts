import type { WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { workspaceOnboardingAnswersSchema } from '@command-center/validation';
import { BadRequestException } from '@nestjs/common';

export class UpdateOnboardingAnswersDto {
  answers!: Partial<WorkspaceOnboardingAnswers>;

  static parse(input: unknown): UpdateOnboardingAnswersDto {
    const body = input as { answers?: unknown };
    const result = workspaceOnboardingAnswersSchema.safeParse(body?.answers);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid onboarding answers',
        errors: result.error.flatten().fieldErrors,
      });
    }

    return { answers: result.data };
  }
}
