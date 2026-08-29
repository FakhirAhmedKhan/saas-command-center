import type { UpdateWorkspaceBlueprintInput } from '@command-center/shared-types';
import { workspaceBlueprintSchema } from '@command-center/validation';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const schema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    blueprint: workspaceBlueprintSchema,
  })
  .strict();

export class UpdateWorkspaceBlueprintDto {
  static parse(value: unknown): UpdateWorkspaceBlueprintInput {
    const result = schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid blueprint update',
        errors: result.error.flatten(),
      });
    }

    return result.data;
  }
}
