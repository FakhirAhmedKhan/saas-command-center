import { InternalServerErrorException, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class MobileTelemetrySecretService {
  encrypt(value: Record<string, string>): string {
    const key = this.getKey();

    const iv = randomBytes(12);

    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);

    const tag = cipher.getAuthTag();

    return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
  }

  decrypt(value: string): Record<string, string> {
    const [version, ivEncoded, tagEncoded, encryptedEncoded] = value.split('.');

    if (version !== 'v1' || !ivEncoded || !tagEncoded || !encryptedEncoded) {
      throw new InternalServerErrorException('Invalid telemetry secret payload.');
    }

    try {
      const decipher = createDecipheriv('aes-256-gcm', this.getKey(), Buffer.from(ivEncoded, 'base64'));

      decipher.setAuthTag(Buffer.from(tagEncoded, 'base64'));

      const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedEncoded, 'base64')), decipher.final()]).toString('utf8');

      return JSON.parse(decrypted) as Record<string, string>;
    } catch {
      throw new InternalServerErrorException('Unable to decrypt telemetry configuration.');
    }
  }

  private getKey(): Buffer {
    const encoded = process.env.MOBILE_TELEMETRY_ENCRYPTION_KEY;

    if (!encoded) {
      throw new InternalServerErrorException('MOBILE_TELEMETRY_ENCRYPTION_KEY is not configured.');
    }

    const key = Buffer.from(encoded, 'base64');

    if (key.length !== 32) {
      throw new InternalServerErrorException('MOBILE_TELEMETRY_ENCRYPTION_KEY must decode to exactly 32 bytes.');
    }

    return key;
  }
}
