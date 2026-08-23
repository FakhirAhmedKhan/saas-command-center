import { BadRequestException, Injectable } from '@nestjs/common';

const SAFE_EXTERNAL_ID = /^[A-Za-z0-9][A-Za-z0-9:._/@+-]{0,254}$/;

const SAFE_CONFIG_KEY = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

@Injectable()
export class MobileProviderSecurityService {
  normalizeExternalProjectId(value: string): string {
    const result = value.trim();

    if (!SAFE_EXTERNAL_ID.test(result)) {
      throw new BadRequestException('Invalid external project ID.');
    }

    return result;
  }

  normalizeConfig(input: Record<string, unknown>): Record<string, string> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Provider configuration must be an object.');
    }

    const entries = Object.entries(input);

    if (entries.length === 0 || entries.length > 32) {
      throw new BadRequestException('Provider configuration must contain between 1 and 32 fields.');
    }

    const output: Record<string, string> = {};

    let totalBytes = 0;

    for (const [rawKey, rawValue] of entries) {
      const key = rawKey.trim();

      if (FORBIDDEN_KEYS.has(key) || !SAFE_CONFIG_KEY.test(key)) {
        throw new BadRequestException('Provider configuration contains an invalid key.');
      }

      if (typeof rawValue !== 'string') {
        throw new BadRequestException(`Provider configuration "${key}" must be a string.`);
      }

      const value = rawValue.trim();

      const maxLength = key === 'serviceAccountJson' ? 65536 : 16384;

      if (!value || value.length > maxLength) {
        throw new BadRequestException(`Provider configuration "${key}" is invalid.`);
      }

      totalBytes += Buffer.byteLength(key) + Buffer.byteLength(value);

      if (totalBytes > 96 * 1024) {
        throw new BadRequestException('Provider configuration is too large.');
      }

      output[key] = value;
    }

    return output;
  }

  assertCustomBaseUrl(rawUrl: string): URL {
    let url: URL;

    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid custom telemetry URL.');
    }

    if (url.protocol !== 'https:') {
      throw new BadRequestException('Custom telemetry provider must use HTTPS.');
    }

    if (url.username || url.password) {
      throw new BadRequestException('Credentials must not be embedded in provider URLs.');
    }

    const allowedHosts = (process.env.CUSTOM_TELEMETRY_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);

    if (allowedHosts.length === 0) {
      throw new BadRequestException('Custom telemetry providers are disabled until CUSTOM_TELEMETRY_ALLOWED_HOSTS is configured.');
    }

    if (!allowedHosts.includes(url.hostname.toLowerCase())) {
      throw new BadRequestException('Custom telemetry host is not allowed.');
    }

    return url;
  }
}
