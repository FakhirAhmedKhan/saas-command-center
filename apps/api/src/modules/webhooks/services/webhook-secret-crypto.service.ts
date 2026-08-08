import {
  Injectable,
} from '@nestjs/common';

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

import type {
  TypedConfigService,
} from '../../../config/runtime-config';

export interface EncryptedWebhookSecret {
  ciphertext:
    string;

  iv:
    string;

  authTag:
    string;

  keyVersion:
    number;
}

@Injectable()
export class WebhookSecretCryptoService {
  private readonly key:
    Buffer;

  constructor(
    config:
      TypedConfigService,
  ) {
    this.key =
      Buffer.from(
        config.get(
          'WEBHOOK_ENCRYPTION_KEY',
          {
            infer: true,
          },
        ),
        'base64',
      );

    if (
      this.key.length !==
      32
    ) {
      throw new Error(
        'Webhook encryption key must be exactly 32 bytes.',
      );
    }
  }

  generateSecret():
    string {
    return randomBytes(32)
      .toString(
        'base64url',
      );
  }

  encrypt(
    plaintext:
      string,
  ): EncryptedWebhookSecret {
    const iv =
      randomBytes(12);

    const cipher =
      createCipheriv(
        'aes-256-gcm',
        this.key,
        iv,
      );

    const ciphertext =
      Buffer.concat([
        cipher.update(
          plaintext,
          'utf8',
        ),

        cipher.final(),
      ]);

    const authTag =
      cipher.getAuthTag();

    return {
      ciphertext:
        ciphertext.toString(
          'base64',
        ),

      iv:
        iv.toString(
          'base64',
        ),

      authTag:
        authTag.toString(
          'base64',
        ),

      keyVersion:
        1,
    };
  }

  decrypt(
    input:
      EncryptedWebhookSecret,
  ): string {
    const decipher =
      createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(
          input.iv,
          'base64',
        ),
      );

    decipher.setAuthTag(
      Buffer.from(
        input.authTag,
        'base64',
      ),
    );

    return Buffer.concat([
      decipher.update(
        Buffer.from(
          input.ciphertext,
          'base64',
        ),
      ),

      decipher.final(),
    ]).toString(
      'utf8',
    );
  }
}