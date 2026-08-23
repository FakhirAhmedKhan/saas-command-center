import { DesktopSecretSanitizerService } from 'src/modules/desktop-apps/security/desktop-secret-sanitizer.service';

describe('DesktopSecretSanitizerService', () => {
  const service = new DesktopSecretSanitizerService();

  it('redacts secret keys recursively', () => {
    expect(
      service.sanitize({
        name: 'desktop',
        token: 'secret-token',
        nested: {
          apiKey: 'secret-key',
          password: 'secret-password',
          signingCertificate: 'secret-certificate',
          safe: 'visible',
        },
      }),
    ).toEqual({
      name: 'desktop',
      token: '[REDACTED]',
      nested: {
        apiKey: '[REDACTED]',
        password: '[REDACTED]',
        signingCertificate: '[REDACTED]',
        safe: 'visible',
      },
    });
  });

  it('redacts bearer-like values embedded in strings', () => {
    expect(service.sanitize('Authorization: Bearer abc.def.secret')).toContain('[REDACTED]');
  });
});