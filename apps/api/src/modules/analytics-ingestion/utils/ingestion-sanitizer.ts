import { BadRequestException } from '@nestjs/common';

import { Prisma } from 'src/generated/prisma/client';

const SENSITIVE_QUERY_PARAMETER =
  /^(access_?token|refresh_?token|token|password|pass|secret|authorization|auth|api_?key|session|session_?id|jwt|email|code|otp)$/i;

const SENSITIVE_PROPERTY_KEY = /(password|passcode|token|secret|authorization|cookie|session|email|phone|address|credit|card|cvv|ssn|private|api.?key)/i;

const MAX_PROPERTY_KEYS = 20;
const MAX_PROPERTY_STRING = 200;
const MAX_ARRAY_ITEMS = 20;

export function normalizeRequestOrigin(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException('Request origin is invalid');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Request origin must use HTTP or HTTPS');
  }

  return url.origin.toLowerCase();
}

export function sanitizeTrackedUrl(
  value: string,
  expectedOrigin?: string,
): {
  url: string;
  path: string;
} {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException('Tracked URL is invalid');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Tracked URL must use HTTP or HTTPS');
  }

  if (expectedOrigin && url.origin.toLowerCase() !== expectedOrigin) {
    throw new BadRequestException('Tracked URL does not match the request origin');
  }

  url.username = '';
  url.password = '';
  url.hash = '';

  for (const key of [...url.searchParams.keys()]) {
    if (SENSITIVE_QUERY_PARAMETER.test(key)) {
      url.searchParams.delete(key);
    }
  }

  url.searchParams.sort();

  const path = `${url.pathname}${url.search}`;

  return {
    url: url.toString().slice(0, 2048),

    path: path.slice(0, 2048),
  };
}

export function sanitizeReferrerUrl(value?: string): string | null {
  if (!value) {
    return null;
  }

  try {
    return sanitizeTrackedUrl(value).url;
  } catch {
    return null;
  }
}

export function sanitizeEventProperties(properties?: Record<string, unknown>): Prisma.InputJsonObject | undefined {
  if (!properties) {
    return undefined;
  }

  const sanitized: Record<string, Prisma.InputJsonValue | null> = {};

  const entries = Object.entries(properties).slice(0, MAX_PROPERTY_KEYS);

  for (const [rawKey, value] of entries) {
    const key = rawKey.trim().slice(0, 64);

    if (!key || SENSITIVE_PROPERTY_KEY.test(key)) {
      continue;
    }

    const sanitizedValue = sanitizePropertyValue(value);

    if (sanitizedValue !== undefined) {
      sanitized[key] = sanitizedValue;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizePropertyValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (typeof value === 'string') {
    return value.slice(0, MAX_PROPERTY_STRING);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    const result = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map(sanitizePropertyValue)
      .filter((item): item is Prisma.InputJsonValue => item !== undefined);

    return result;
  }

  return undefined;
}
