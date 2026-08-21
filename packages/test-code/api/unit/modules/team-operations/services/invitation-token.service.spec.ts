import { InvitationTokenService } from 'src/modules/team-operations/services/invitation-token.service';

describe(InvitationTokenService.name, () => {
  const config = {
    get(key: string) {
      const values: Record<string, unknown> = {
        INVITATION_TOKEN_PEPPER: 'test-pepper-with-more-than-thirty-two-characters',
        INVITATION_TTL_HOURS: 72,
        FRONTEND_URL: 'http://localhost:3000',
      };

      return values[key];
    },
  };

  const service = new InvitationTokenService(config as never);

  it('generates random tokens and deterministic hashes', () => {
    const first = service.generate();

    const second = service.generate();

    expect(first.rawToken).not.toBe(second.rawToken);

    expect(service.hash(first.rawToken)).toBe(first.tokenHash);
  });

  it('does not include the raw token in its hash', () => {
    const generated = service.generate();

    expect(generated.tokenHash).not.toContain(generated.rawToken);
  });
});
