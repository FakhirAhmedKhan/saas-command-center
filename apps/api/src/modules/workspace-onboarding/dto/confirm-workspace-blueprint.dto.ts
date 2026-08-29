import type { ConfirmWorkspaceBlueprintInput } from '@command-center/shared-types';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const schema = z
  .object({
    expectedRevision: z.number().int().positive(),
    blueprintHash: z.string().regex(/^[a-f0-9]{64}$/),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export class ConfirmWorkspaceBlueprintDto {
  static parse(value: unknown): ConfirmWorkspaceBlueprintInput {
    const result = schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid confirmation request',
        errors: result.error.flatten(),
      });
    }

    return result.data;
  }
}
