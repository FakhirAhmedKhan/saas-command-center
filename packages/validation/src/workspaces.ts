import type { CreateWorkspaceInput } from '@command-center/shared-types';
import { z } from 'zod';

export const workspaceSlugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const createWorkspaceSchema: z.ZodType<CreateWorkspaceInput> = z.object({
  name: z.string().min(2).max(120),
  slug: workspaceSlugSchema.optional(),
});
