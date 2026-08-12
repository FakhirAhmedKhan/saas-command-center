import type { LoginInput, RegisterInput } from '@command-center/shared-types';
import { z } from 'zod';

export const loginSchema: z.ZodType<LoginInput> = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
});

export const registerSchema: z.ZodType<RegisterInput> = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(128),
  displayName: z.string().min(2).max(120).optional(),
});

