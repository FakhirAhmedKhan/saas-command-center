import { Injectable } from '@nestjs/common';

const SENSITIVE_KEY = /(password|passwd|token|secret|api[_-]?key|app[_-]?key|authorization|cookie|private[_-]?key|credential|serviceaccount|encryptedconfig)/i;
const SECRET_PATTERNS = [/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, /(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^"',\s}]+/gi, /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi];

@Injectable()
export class MobileSecretSanitizerService {
  sanitize<T>(value: T): T {
    return this.walk(value, 0) as T;
  }

  sanitizeText(value: string): string {
    let result = value;

    for (const pattern of SECRET_PATTERNS) {
      result = result.replace(pattern, '[REDACTED]');
    }

    return result;
  }

  private walk(value: unknown, depth: number): unknown {
    if (depth > 12) {
      return '[MAX_DEPTH]';
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeText(value);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.walk(item, depth + 1));
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};

      for (const [key, child] of Object.entries(value)) {
        if (SENSITIVE_KEY.test(key)) {
          result[key] = '[REDACTED]';

          continue;
        }

        result[key] = this.walk(child, depth + 1);
      }

      return result;
    }

    return typeof value === 'string' ? value : (JSON.stringify(value) ?? '[unserializable]');
  }
}
