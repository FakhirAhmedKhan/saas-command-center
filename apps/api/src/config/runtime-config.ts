import {
  ConfigService,
} from '@nestjs/config';

import type {
  EnvironmentVariables,
} from './env.validation';

export type TypedConfigService =
  ConfigService<
    EnvironmentVariables,
    true
  >;

export function getAllowedOrigins(
  config: TypedConfigService,
): Set<string> {
  const origins = config
    .get(
      'CORS_ORIGINS',
      {
        infer: true,
      },
    )
    .split(',')
    .map((origin) =>
      origin.trim(),
    )
    .filter(
      (origin) =>
        origin.length > 0,
    );

  return new Set(origins);
}

export function parseTrustProxy(
  value: string,
): boolean | number | string {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  const numericValue =
    Number(value);

  if (
    Number.isInteger(
      numericValue,
    ) &&
    numericValue >= 0
  ) {
    return numericValue;
  }

  return value;
}