import { Prisma } from 'src/generated/prisma/client';

const SECRET_KEY_PATTERN =
  /^(password|passwordhash|token|accesstoken|refreshtoken|authorization|cookie|secret|clientsecret|apikey|privatekey|credentials|session|sessionid)$/i;

const MAX_DEPTH = 5;
const MAX_OBJECT_KEYS = 40;
const MAX_ARRAY_ITEMS = 40;
const MAX_STRING_LENGTH = 500;

function normalizeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '');
}

function sanitizeString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}…`;
}

function sanitizeValue(value: unknown, depth: number): Prisma.InputJsonValue | undefined {
  if (depth > MAX_DEPTH) {
    return '[Maximum depth reached]';
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item): item is Prisma.InputJsonValue => item !== undefined);
  }

  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;

    const result: Record<string, Prisma.InputJsonValue> = {};

    const entries = Object.entries(source).slice(0, MAX_OBJECT_KEYS);

    for (const [key, item] of entries) {
      if (SECRET_KEY_PATTERN.test(normalizeKey(key))) {
        result[key] = '[REDACTED]';
        continue;
      }

      const sanitized = sanitizeValue(item, depth + 1);

      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }

    return result;
  }

  return sanitizeString(String(value));
}

export function sanitizeActivityMetadata(metadata?: Record<string, unknown>): Prisma.InputJsonObject | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized = sanitizeValue(metadata, 0);

  if (!sanitized || Array.isArray(sanitized) || typeof sanitized !== 'object') {
    return undefined;
  }

  return sanitized as Prisma.InputJsonObject;
}
