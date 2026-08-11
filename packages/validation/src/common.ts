import { z } from 'zod';

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const uuidSchema = z.string().uuid();

export const isoDateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date value');

export const safeHttpUrlSchema = z.string().refine(isSafeHttpUrl, 'Must be a valid HTTP or HTTPS URL');

export const optionalNullableIsoDateSchema = isoDateStringSchema.nullable().optional();

export const paginationPageSchema = z.number().int().min(1);

export const paginationLimitSchema = z.number().int().min(1).max(100);
