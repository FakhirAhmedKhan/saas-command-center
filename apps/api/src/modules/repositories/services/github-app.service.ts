import { createSign } from 'node:crypto';
import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';

interface GithubInstallationResponse {
  id: number;

  account: {
    login?: string;
    type?: string;
  } | null;
}

interface GithubInstallationTokenResponse {
  token: string;
  expires_at: string;
}

interface GithubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  archived: boolean;

  owner: {
    login: string;
  };
}

interface GithubRepositoriesResponse {
  repositories: GithubRepositoryResponse[];
  total_count: number;
}

interface GithubOauthResponse {
  access_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export interface GithubRepository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
  archived: boolean;
}

export interface GithubInstallation {
  id: string;
  accountLogin: string;
  accountType: string;
}

@Injectable()
export class GithubAppService {
  getInstallationAccessToken(installationId: string): Promise<string> {
    return this.createInstallationAccessToken(installationId);
  }
  private readonly apiVersion = '2026-03-10';

  buildInstallationUrl(state: string): string {
    // const slug = this.required('GITHUB_APP_SLUG' );
    const slug = 'saas-command-center-dev';

    return `https://github.com/apps/${encodeURIComponent(slug)}` + `/installations/new?state=${encodeURIComponent(state)}`;
  }

  buildUserAuthorizationUrl(state: string, codeChallenge: string): string {
    const clientId = this.required('GITHUB_APP_CLIENT_ID');
    const callbackUrl = this.required('GITHUB_APP_CALLBACK_URL');

    const url = new URL('https://github.com/login/oauth/authorize');

    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return url.toString();
  }

  async getInstallation(installationId: string): Promise<GithubInstallation> {
    const data = await this.appJson<GithubInstallationResponse>(`/app/installations/${this.numericId(installationId)}`, {
      method: 'GET',
    });

    const accountLogin = data.account?.login?.trim();

    if (!accountLogin) {
      throw new BadGatewayException('GitHub installation account is unavailable.');
    }

    return {
      id: String(data.id),
      accountLogin,
      accountType: data.account?.type?.trim() ?? 'Unknown',
    };
  }

  async exchangeUserCode(code: string, codeVerifier: string): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.required('GITHUB_APP_CLIENT_ID'),
      client_secret: this.required('GITHUB_APP_CLIENT_SECRET'),
      code,
      redirect_uri: this.required('GITHUB_APP_CALLBACK_URL'),
      code_verifier: codeVerifier,
    });

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',

      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },

      body,

      signal: AbortSignal.timeout(15_000),
    });

    const data = (await response.json()) as GithubOauthResponse;

    if (!response.ok || !data.access_token) {
      throw new BadGatewayException(data.error_description ?? data.error ?? 'GitHub user authorization failed.');
    }

    return data.access_token;
  }

  async userCanAccessInstallation(userAccessToken: string, installationId: string): Promise<boolean> {
    const response = await fetch(`https://api.github.com/user/installations/${this.numericId(installationId)}/repositories?per_page=1`, {
      method: 'GET',
      headers: this.githubHeaders(userAccessToken),
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 403 || response.status === 404) {
      return false;
    }

    if (!response.ok) {
      throw new BadGatewayException(`GitHub installation authorization check failed with status ${response.status}.`);
    }

    return true;
  }

  async listInstallationRepositories(installationId: string): Promise<GithubRepository[]> {
    const token = await this.createInstallationAccessToken(installationId);

    const repositories: GithubRepository[] = [];

    for (let page = 1; ; page += 1) {
      const data = await this.tokenJson<GithubRepositoriesResponse>(token, `/installation/repositories?per_page=100&page=${page}`, {
        method: 'GET',
      });

      for (const repository of data.repositories) {
        repositories.push({
          id: String(repository.id),
          owner: repository.owner.login,
          name: repository.name,
          fullName: repository.full_name,
          defaultBranch: repository.default_branch,
          isPrivate: repository.private,
          htmlUrl: repository.html_url,
          archived: repository.archived,
        });
      }

      if (data.repositories.length < 100) {
        break;
      }
    }

    return repositories;
  }

  getWebhookSecret(): string {
    return this.required('GITHUB_APP_WEBHOOK_SECRET');
  }

  private async createInstallationAccessToken(installationId: string): Promise<string> {
    const data = await this.appJson<GithubInstallationTokenResponse>(`/app/installations/${this.numericId(installationId)}/access_tokens`, {
      method: 'POST',
    });

    if (!data.token) {
      throw new BadGatewayException('GitHub did not return an installation token.');
    }

    return data.token;
  }

  private async appJson<T>(path: string, init: RequestInit): Promise<T> {
    return this.githubJson<T>(path, {
      ...init,
      headers: this.githubHeaders(this.createAppJwt()),
    });
  }

  private async tokenJson<T>(token: string, path: string, init: RequestInit): Promise<T> {
    return this.githubJson<T>(path, {
      ...init,
      headers: this.githubHeaders(token),
    });
  }

  private async githubJson<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`https://api.github.com${path}`, {
      ...init,
      signal: AbortSignal.timeout(15_000),
    });

    const text = await response.text();

    let body: unknown;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = undefined;
      }
    }

    if (!response.ok) {
      let message = `GitHub request failed with status ${response.status}.`;

      if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
        message = body.message;
      }

      throw new BadGatewayException(message);
    }

    return body as T;
  }

  private githubHeaders(token: string): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': this.apiVersion,
      'User-Agent': 'saas-command-center',
    };
  }

  private createAppJwt(): string {
    const clientId = this.required('GITHUB_APP_CLIENT_ID');
    const privateKey = this.privateKey();

    const now = Math.floor(Date.now() / 1000);

    const header = Buffer.from(
      JSON.stringify({
        alg: 'RS256',
        typ: 'JWT',
      }),
    ).toString('base64url');

    const payload = Buffer.from(
      JSON.stringify({
        iat: now - 60,
        exp: now + 9 * 60,
        iss: clientId,
      }),
    ).toString('base64url');

    const unsignedToken = `${header}.${payload}`;

    const signer = createSign('RSA-SHA256');

    signer.update(unsignedToken);
    signer.end();

    const signature = signer.sign(privateKey).toString('base64url');

    return `${unsignedToken}.${signature}`;
  }

  private privateKey(): string {
    const encoded = this.required('GITHUB_APP_PRIVATE_KEY_BASE64');

    const key = Buffer.from(encoded, 'base64').toString('utf8');

    if (!key.includes('PRIVATE KEY')) {
      throw new ServiceUnavailableException('GitHub App private key configuration is invalid.');
    }

    return key;
  }

  private numericId(value: string): string {
    if (!/^\d+$/.test(value)) {
      throw new BadGatewayException('GitHub returned an invalid numeric identifier.');
    }

    return value;
  }

  private required(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
      throw new ServiceUnavailableException(`GitHub integration is not configured: ${name} is missing.`);
    }

    return value;
  }
}
