import { Injectable } from '@nestjs/common';

const SECRET_KEY = /(secret|token|password|private[_-]?key|api[_-]?key|authorization|credential|certificate|cert|dsn)/i;

const SECRET_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi,
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /Bearer\s+[A-Za-z0-9._~+-]+=*/gi,
  /sk-[A-Za-z0-9_-]{20,}/g,
];

@Injectable()
export class DesktopSecretSanitizerService {
  sanitize<T>(value: T): T {
    return this.walk(value, new WeakSet<object>()) as T;
  }

  private walk(value: unknown, seen: WeakSet<object>): unknown {
    if (typeof value === 'string') return this.redactString(value);
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    if (seen.has(value)) return '[REDACTED:CIRCULAR]';
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => this.walk(item, seen));
    }

    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(source)) {
      if (SECRET_KEY.test(key)) {
        result[key] = '[REDACTED]';
        continue;
      }

      result[key] = this.walk(child, seen);
    }

    return result;
  }

  private redactString(value: string): string {
    let output = value;

    for (const pattern of SECRET_VALUE_PATTERNS) {
      output = output.replace(pattern, '[REDACTED]');
    }

    return output;
  }
}
