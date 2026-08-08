import { WebhookSecretCryptoService } from './webhook-secret-crypto.service';

describe(WebhookSecretCryptoService.name, () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  const config = {
    get(name: string) {
      if (name === 'WEBHOOK_ENCRYPTION_KEY') {
        return key;
      }

      return undefined;
    },
  };

  const service = new WebhookSecretCryptoService(config as never);

  it('encrypts and decrypts a webhook secret', () => {
    const secret = service.generateSecret();

    const encrypted = service.encrypt(secret);

    expect(encrypted.ciphertext).not.toContain(secret);

    expect(service.decrypt(encrypted)).toBe(secret);
  });

  it('uses a different IV for each encryption', () => {
    const first = service.encrypt('same-secret');

    const second = service.encrypt('same-secret');

    expect(first.iv).not.toBe(second.iv);

    expect(first.ciphertext).not.toBe(second.ciphertext);
  });
});
