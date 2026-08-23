import { MobileSecretSanitizerService } from 'src/modules/mobile-apps/security/mobile-secret-sanitizer.service';

describe('MobileSecretSanitizerService', () => {
  const service = new MobileSecretSanitizerService();

  it('redacts sensitive object keys', () => {
    const result = service.sanitize({
      authToken: 'secret',

      nested: {
        apiKey: 'key',

        safe: 'hello',
      },
    });

    expect(result).toEqual({
      authToken: '[REDACTED]',

      nested: {
        apiKey: '[REDACTED]',

        safe: 'hello',
      },
    });
  });

  it('redacts bearer token from text', () => {
    expect(service.sanitizeText('Authorization Bearer abc.def.ghi')).not.toContain('abc.def.ghi');
  });
});
