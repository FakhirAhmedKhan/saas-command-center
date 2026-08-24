import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class DesktopTelemetrySecretService {
  private readonly algorithm = 'aes-256-gcm';

  encrypt(secret: string): string {
    const value = secret.trim();

    if (!value) {
      throw new ServiceUnavailableException('Telemetry secret cannot be empty.');
    }

    const key = this.key();
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
  }

  decrypt(payload: string): string {
    const [version, ivValue, tagValue, ciphertextValue] = payload.split('.');

    if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) {
      throw new ServiceUnavailableException('Telemetry secret payload is invalid.');
    }

    const decipher = createDecipheriv(this.algorithm, this.key(), Buffer.from(ivValue, 'base64url'));

    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

    return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8');
  }

  private key(): Buffer {
    const configured = process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY;

    if (!configured) {
      throw new ServiceUnavailableException('DESKTOP_TELEMETRY_ENCRYPTION_KEY is not configured.');
    }

    let key: Buffer;

    try {
      key = Buffer.from(configured, 'base64');
    } catch {
      throw new ServiceUnavailableException('DESKTOP_TELEMETRY_ENCRYPTION_KEY must be valid base64.');
    }

    if (key.length !== 32) {
      throw new ServiceUnavailableException('DESKTOP_TELEMETRY_ENCRYPTION_KEY must decode to exactly 32 bytes.');
    }

    return key;
  }
}
