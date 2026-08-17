import { ARGON2ID_OPTIONS, PasswordService } from 'src/modules/auth/services/password.service';
import * as argon2 from 'argon2';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes a password using argon2id with the pinned explicit parameters', async () => {
    const hash = await service.hash('CorrectHorseBatteryStaple1!');

    expect(hash.startsWith('$argon2id$')).toBe(true);

    expect(hash).toContain(`m=${ARGON2ID_OPTIONS.memoryCost}`);
    expect(hash).toContain(`t=${ARGON2ID_OPTIONS.timeCost}`);
    expect(hash).toContain(`p=${ARGON2ID_OPTIONS.parallelism}`);
  });

  it('verifies the correct password against its own hash', async () => {
    const password = 'CorrectHorseBatteryStaple1!';

    const hash = await service.hash(password);

    await expect(service.verify(hash, password)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('CorrectHorseBatteryStaple1!');

    await expect(service.verify(hash, 'WrongPassword1!')).resolves.toBe(false);
  });

  it('returns false instead of throwing for a malformed hash', async () => {
    await expect(service.verify('not-a-real-hash', 'anything')).resolves.toBe(false);
  });

  it('still verifies a hash produced under the library defaults (pre-hardening format)', async () => {
    const password = 'CorrectHorseBatteryStaple1!';

    // Simulates a hash created before explicit parameters were pinned.
    const legacyStyleHash = await argon2.hash(password, { type: argon2.argon2id });

    await expect(service.verify(legacyStyleHash, password)).resolves.toBe(true);
  });
});
