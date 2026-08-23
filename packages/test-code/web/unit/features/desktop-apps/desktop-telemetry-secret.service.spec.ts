import { DesktopTelemetrySecretService } from 'src/modules/desktop-apps/services/desktop-telemetry-secret.service';

DescribeDesktopTelemetrySecretService();

function DescribeDesktopTelemetrySecretService() {
  describe('DesktopTelemetrySecretService', () => {
    const service = new DesktopTelemetrySecretService();

    beforeEach(() => {
      process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(
        32,
        11,
      ).toString('base64');
    });

    afterEach(() => {
      delete process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY;
    });

    it('encrypts and decrypts a secret', () => {
      const encrypted = service.encrypt('provider-token-123');

      expect(encrypted).not.toContain('provider-token-123');
      expect(service.decrypt(encrypted)).toBe('provider-token-123');
    });

    it('uses a random IV so the same plaintext produces different ciphertext', () => {
      const first = service.encrypt('same-secret');
      const second = service.encrypt('same-secret');

      expect(first).not.toBe(second);
      expect(service.decrypt(first)).toBe('same-secret');
      expect(service.decrypt(second)).toBe('same-secret');
    });

    it('rejects missing encryption key', () => {
      delete process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY;

      expect(() => service.encrypt('secret-value')).toThrow(
        /DESKTOP_TELEMETRY_ENCRYPTION_KEY/,
      );
    });

    it('rejects a key that is not 32 bytes', () => {
      process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(
        16,
        1,
      ).toString('base64');

      expect(() => service.encrypt('secret-value')).toThrow(/32 bytes/);
    });
  });
}