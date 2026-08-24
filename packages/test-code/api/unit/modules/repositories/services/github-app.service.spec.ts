import { generateKeyPairSync } from 'node:crypto';
import { GithubAppService } from 'src/modules/repositories/services/github-app.service';

const GITHUB_ENV_KEYS = ['GITHUB_APP_SLUG', 'GITHUB_APP_CLIENT_ID', 'GITHUB_APP_CLIENT_SECRET', 'GITHUB_APP_CALLBACK_URL', 'GITHUB_APP_WEBHOOK_SECRET', 'GITHUB_APP_PRIVATE_KEY_BASE64'] as const;

function validPrivateKeyBase64(): string {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },

    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
  });

  return Buffer.from(privateKey).toString('base64');
}

describe(GithubAppService.name, () => {
  const originalEnv: Record<string, string | undefined> = {};
  let service: GithubAppService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    for (const key of GITHUB_ENV_KEYS) {
      originalEnv[key] = process.env[key];

      delete process.env[key];
    }

    service = new GithubAppService();

    fetchMock = jest.fn();

    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    for (const key of GITHUB_ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }

    jest.restoreAllMocks();
  });

  describe('missing GitHub configuration', () => {
    it('throws a clear ServiceUnavailableException when GITHUB_APP_SLUG is missing', () => {
      expect(() => service.buildInstallationUrl('state-1')).toThrow('GitHub integration is not configured: GITHUB_APP_SLUG is missing.');
    });

    it('throws a clear ServiceUnavailableException when GITHUB_APP_CLIENT_ID is missing', () => {
      process.env.GITHUB_APP_CALLBACK_URL = 'http://localhost:3000/github/callback';

      expect(() => service.buildUserAuthorizationUrl('state-1', 'challenge-1')).toThrow('GitHub integration is not configured: GITHUB_APP_CLIENT_ID is missing.');
    });

    it('throws before making any network call', async () => {
      await expect(service.getInstallation('123')).rejects.toThrow('GitHub integration is not configured');

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('GitHub App slug', () => {
    it('is read from the environment, not hardcoded', () => {
      process.env.GITHUB_APP_SLUG = 'my-custom-app-slug';

      const url = service.buildInstallationUrl('state-1');

      expect(url).toContain('/apps/my-custom-app-slug/installations/new');
      expect(url).not.toContain('saas-command-center-dev');
    });

    it('URL-encodes the configured slug', () => {
      process.env.GITHUB_APP_SLUG = 'weird slug/value';

      const url = service.buildInstallationUrl('state-1');

      expect(url).toContain(encodeURIComponent('weird slug/value'));
    });
  });

  describe('authorization URL host', () => {
    beforeEach(() => {
      process.env.GITHUB_APP_CLIENT_ID = 'client-id-1';
      process.env.GITHUB_APP_CALLBACK_URL = 'http://localhost:3000/github/callback';
    });

    it('always builds an https://github.com authorization URL', () => {
      const authorizationUrl = service.buildUserAuthorizationUrl('state-1', 'challenge-1');
      const parsed = new URL(authorizationUrl);

      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname).toBe('github.com');
      expect(parsed.pathname).toBe('/login/oauth/authorize');
    });

    it('includes the PKCE challenge and state as query parameters', () => {
      const authorizationUrl = service.buildUserAuthorizationUrl('state-1', 'challenge-1');
      const parsed = new URL(authorizationUrl);

      expect(parsed.searchParams.get('state')).toBe('state-1');
      expect(parsed.searchParams.get('code_challenge')).toBe('challenge-1');
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('always builds an https://github.com installation URL', () => {
      process.env.GITHUB_APP_SLUG = 'command-center-dev';

      const installationUrl = service.buildInstallationUrl('state-1');
      const parsed = new URL(installationUrl);

      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname).toBe('github.com');
    });
  });

  describe('private key validation', () => {
    beforeEach(() => {
      process.env.GITHUB_APP_CLIENT_ID = 'client-id-1';

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ token: 'ghs_installation_token', expires_at: '2026-01-01T00:00:00Z' }),
      });
    });

    it('rejects with a clear configuration error when GITHUB_APP_PRIVATE_KEY_BASE64 is missing', async () => {
      await expect(service.getInstallation('123')).rejects.toThrow('GitHub integration is not configured: GITHUB_APP_PRIVATE_KEY_BASE64 is missing.');
    });

    it('rejects with a clear configuration error for a non-PEM value, without leaking the value', async () => {
      process.env.GITHUB_APP_PRIVATE_KEY_BASE64 = Buffer.from('not a private key at all').toString('base64');

      await expect(service.getInstallation('123')).rejects.toThrow('GitHub App private key configuration is invalid.');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects with a clear configuration error for a truncated/corrupted PEM', async () => {
      const truncated = validPrivateKeyBase64().slice(0, 200);

      process.env.GITHUB_APP_PRIVATE_KEY_BASE64 = truncated;

      await expect(service.getInstallation('123')).rejects.toThrow('GitHub App private key configuration is invalid.');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('never includes the raw key material in a thrown error message', async () => {
      const badKey = `-----BEGIN RSA PRIVATE KEY-----\nnot-actually-valid-base64-body-should-not-leak\n-----END RSA PRIVATE KEY-----`;

      process.env.GITHUB_APP_PRIVATE_KEY_BASE64 = Buffer.from(badKey).toString('base64');

      try {
        await service.getInstallation('123');

        throw new Error('Expected getInstallation to reject for a malformed key.');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        expect(message).not.toContain('not-actually-valid-base64-body-should-not-leak');
      }
    });

    it('accepts a well-formed RSA private key and proceeds to call the GitHub API', async () => {
      process.env.GITHUB_APP_PRIVATE_KEY_BASE64 = validPrivateKeyBase64();

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: 123, account: { login: 'octocat', type: 'User' } }),
      });

      const installation = await service.getInstallation('123');

      expect(installation.accountLogin).toBe('octocat');
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
