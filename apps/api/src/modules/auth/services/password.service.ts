import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/*
 * Pinned explicitly rather than left to the argon2 library's implicit
 * defaults, so a future dependency upgrade can't silently change the
 * effective hashing strength without anyone noticing. These values match
 * the library's own current defaults (verified against argon2@0.45) —
 * pinning them changes nothing about current hashing speed or output, it
 * only removes the implicit dependency. They already sit at/above OWASP's
 * minimum recommended Argon2id parameters (m=19456 KiB, t=2, p=1).
 */
export const ARGON2ID_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
} as const;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2ID_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
