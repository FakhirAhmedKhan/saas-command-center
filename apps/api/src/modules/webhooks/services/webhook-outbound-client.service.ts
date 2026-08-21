import { BadRequestException, Injectable } from '@nestjs/common';
import ipaddr from 'ipaddr.js';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Agent, request } from 'undici';

interface ResolvedAddress {
  address: string;

  family: 4 | 6;
}

export interface WebhookHttpResult {
  success: boolean;

  retriable: boolean;

  statusCode: number | null;

  durationMs: number;

  errorCode: string | null;

  errorMessage: string | null;
}

const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', 'metadata', 'metadata.google.internal', 'host.docker.internal']);

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home'];

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');

  if (BLOCKED_HOSTS.has(normalized)) {
    return true;
  }

  return BLOCKED_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function isPublicAddress(address: string): boolean {
  try {
    return ipaddr.process(address).range() === 'unicast';
  } catch {
    return false;
  }
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

@Injectable()
export class WebhookOutboundClientService {
  async validateUrl(rawUrl: string): Promise<void> {
    const url = this.parseUrl(rawUrl);

    await this.resolvePublicAddresses(url.hostname);
  }

  async sendJson(rawUrl: string, rawBody: string, headers: Record<string, string>, timeoutMs: number): Promise<WebhookHttpResult> {
    const startedAt = performance.now();

    let dispatcher: Agent | undefined;

    try {
      const url = this.parseUrl(rawUrl);

      const addresses = await this.resolvePublicAddresses(url.hostname);

      const selectedAddress = addresses.find((address) => address.family === 4) ?? addresses[0];

      if (!selectedAddress) {
        throw new BadRequestException('Webhook hostname resolved to no safe address.');
      }

      dispatcher = new Agent({
        connect: {
          lookup(_hostname, _options, callback) {
            callback(null, selectedAddress.address, selectedAddress.family);
          },
        },
      });

      const response = await request(url, {
        method: 'POST',

        dispatcher,
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs,
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: 'application/json,text/plain,*/*',

          'content-type': 'application/json',

          'user-agent': 'SaaS-Command-Center-Webhook/1.0',

          ...headers,
        },

        body: rawBody,
      });

      await response.body.dump();

      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));

      const success = response.statusCode >= 200 && response.statusCode < 300;

      return {
        success,

        retriable: !success && isRetriableStatus(response.statusCode),
        statusCode: response.statusCode,

        durationMs,

        errorCode: success ? null : 'HTTP_STATUS',
        errorMessage: success ? null : `Webhook returned HTTP ${response.statusCode}.`,
      };
    } catch (error) {
      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));

      const unsafeDestination = error instanceof BadRequestException;

      const message = error instanceof Error ? error.message.slice(0, 500) : 'Unknown webhook delivery failure.';

      return {
        success: false,
        retriable: !unsafeDestination,
        statusCode: null,

        durationMs,

        errorCode: unsafeDestination ? 'UNSAFE_DESTINATION' : error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        errorMessage: message,
      };
    } finally {
      if (dispatcher) {
        await dispatcher.close();
      }
    }
  }

  private parseUrl(rawUrl: string): URL {
    let url: URL;

    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Webhook URL is invalid.');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BadRequestException('Webhook URL must use HTTP or HTTPS.');
    }

    if (url.username || url.password) {
      throw new BadRequestException('Webhook URL cannot contain embedded credentials.');
    }

    if (isBlockedHostname(url.hostname)) {
      throw new BadRequestException('Private and internal webhook destinations are blocked.');
    }

    return url;
  }

  private async resolvePublicAddresses(hostname: string): Promise<ResolvedAddress[]> {
    const addressFamily = isIP(hostname);

    if (addressFamily) {
      if (!isPublicAddress(hostname)) {
        throw new BadRequestException('Private, loopback, link-local, multicast and reserved IP addresses are blocked.');
      }

      return [
        {
          address: hostname,
          family: addressFamily as 4 | 6,
        },
      ];
    }

    let addresses: ResolvedAddress[];

    try {
      addresses = (
        await lookup(hostname, {
          all: true,
          verbatim: true,
        })
      ).map((address) => ({
        address: address.address,
        family: address.family as 4 | 6,
      }));
    } catch {
      throw new BadRequestException('Webhook hostname could not be resolved.');
    }

    if (addresses.length === 0) {
      throw new BadRequestException('Webhook hostname resolved to no address.');
    }

    const unsafe = addresses.find((address) => !isPublicAddress(address.address));

    if (unsafe) {
      throw new BadRequestException(`Webhook destination resolved to a blocked address: ${unsafe.address}`);
    }

    return addresses;
  }
}
