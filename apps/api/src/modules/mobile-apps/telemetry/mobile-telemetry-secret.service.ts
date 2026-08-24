import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

@Injectable()
export class MobileTelemetrySecretService {
  encrypt(config: Record<string, string>): string {
    const key = this.key();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]);
    const payload: EncryptedPayload = {
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: encrypted.toString('base64'),
    };

    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  }

  decrypt(value: string): Record<string, string> {
    const payload = JSON.parse(Buffer.from(value, 'base64').toString('utf8')) as EncryptedPayload;
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(payload.iv, 'base64'));

    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

    const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]);
    const result = JSON.parse(decrypted.toString('utf8')) as unknown;

    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error('Invalid decrypted telemetry configuration');
    }

    const normalized: Record<string, string> = {};

    for (const [key, entry] of Object.entries(result)) {
      if (typeof entry !== 'string') {
        throw new Error('Telemetry configuration contains a non-string value');
      }

      normalized[key] = entry;
    }

    return normalized;
  }

  private key(): Buffer {
    const encoded = process.env.MOBILE_TELEMETRY_ENCRYPTION_KEY;

    if (!encoded) {
      throw new Error('MOBILE_TELEMETRY_ENCRYPTION_KEY is required');
    }

    const key = Buffer.from(encoded, 'base64');

    if (key.length !== 32) {
      throw new Error('MOBILE_TELEMETRY_ENCRYPTION_KEY must decode to exactly 32 bytes');
    }

    return key;
  }
}
