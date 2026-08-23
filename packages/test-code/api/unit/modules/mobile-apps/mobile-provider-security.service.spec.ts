import { MobileProviderSecurityService } from 'src/modules/mobile-apps/security/mobile-provider-security.service';

describe('MobileProviderSecurityService', () => {
  const service = new MobileProviderSecurityService();

  beforeEach(() => {
    process.env.CUSTOM_TELEMETRY_ALLOWED_HOSTS = 'telemetry.example.com';
  });

  it('accepts allowed custom HTTPS host', () => {
    expect(service.assertCustomBaseUrl('https://telemetry.example.com/api').hostname).toBe('telemetry.example.com');
  });

  it('rejects localhost', () => {
    expect(() => service.assertCustomBaseUrl('https://127.0.0.1')).toThrow();
  });

  it('rejects HTTP', () => {
    expect(() => service.assertCustomBaseUrl('http://telemetry.example.com')).toThrow();
  });

  it('rejects prototype pollution keys', () => {
    expect(() => service.normalizeConfig(JSON.parse('{"__proto__":"bad","token":"x"}'))).toThrow();
  });

  it('rejects oversized values', () => {
    expect(() =>
      service.normalizeConfig({
        token: 'x'.repeat(20000),
      }),
    ).toThrow();
  });
});
