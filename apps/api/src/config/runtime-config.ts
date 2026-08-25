import type { EnvironmentVariables } from './env.validation';
import { ConfigService } from '@nestjs/config';

export type TypedConfigService = ConfigService<EnvironmentVariables, true>;

export function getAllowedOrigins(config: TypedConfigService): Set<string> {
  const origins = config
    .get('CORS_ORIGINS', {
      infer: true,
    })
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return new Set(origins);
}

export function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  const numericValue = Number(value);

  if (Number.isInteger(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return value;
}

export function parseBodyLimit(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('BODY_LIMIT must be a positive integer.');
    }

    return value;
  }

  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s*(b|kb|mb|gb)?$/);

  if (!match) {
    throw new Error('BODY_LIMIT must use a format such as 1048576, 1mb, 10mb, or 1gb.');
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 'b';
  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
  };
  const multiplier = multipliers[unit];

  if (multiplier === undefined) {
    throw new Error(`Unsupported BODY_LIMIT unit: ${unit}`);
  }

  const bytes = amount * multiplier;

  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    throw new Error('BODY_LIMIT is outside the supported range.');
  }

  return bytes;
}
