import { hashIpAddressWithSalt } from 'src/modules/analytics-ingestion/utils/ingestion-sanitizer';

describe('hashIpAddressWithSalt (SEC-03)', () => {
  it('produces a 64-character hex SHA-256 digest', () => {
    const hash = hashIpAddressWithSalt('some-salt', '203.0.113.7');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for the same salt and IP', () => {
    const first = hashIpAddressWithSalt('same-salt', '203.0.113.7');

    const second = hashIpAddressWithSalt('same-salt', '203.0.113.7');

    expect(first).toBe(second);
  });

  it('produces different hashes for different salts with the same IP', () => {
    const first = hashIpAddressWithSalt('salt-a', '203.0.113.7');

    const second = hashIpAddressWithSalt('salt-b', '203.0.113.7');

    expect(first).not.toBe(second);
  });

  it('produces different hashes for different IPs with the same salt', () => {
    const first = hashIpAddressWithSalt('same-salt', '203.0.113.7');

    const second = hashIpAddressWithSalt('same-salt', '198.51.100.9');

    expect(first).not.toBe(second);
  });

  it('never leaks the raw IP address into the digest', () => {
    const hash = hashIpAddressWithSalt('some-salt', '203.0.113.7');

    expect(hash).not.toContain('203.0.113.7');
  });
});
