import {
  Injectable,
} from '@nestjs/common';

import {
  createHmac,
  randomBytes,
} from 'node:crypto';

import type {
  TypedConfigService,
} from '../../../config/runtime-config';

export interface GeneratedInvitationToken {
  rawToken: string;
  tokenHash: string;
}

@Injectable()
export class InvitationTokenService {
  constructor(
    private readonly config:
      TypedConfigService,
  ) {}

  generate():
    GeneratedInvitationToken {
    const rawToken =
      randomBytes(32)
        .toString('base64url');

    return {
      rawToken,

      tokenHash:
        this.hash(rawToken),
    };
  }

  hash(
    rawToken: string,
  ): string {
    return createHmac(
      'sha256',

      this.config.get(
        'INVITATION_TOKEN_PEPPER',
        {
          infer: true,
        },
      ),
    )
      .update(rawToken)
      .digest('hex');
  }

  getExpiresAt():
    Date {
    const ttlHours =
      this.config.get(
        'INVITATION_TTL_HOURS',
        {
          infer: true,
        },
      );

    return new Date(
      Date.now() +
        ttlHours *
          60 *
          60 *
          1_000,
    );
  }

  createInvitationUrl(
    rawToken: string,
  ): string {
    const frontendUrl =
      this.config.get(
        'FRONTEND_URL',
        {
          infer: true,
        },
      );

    return `${frontendUrl}/invitations/${encodeURIComponent(
      rawToken,
    )}`;
  }
}