import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { WEBHOOK_SIGNATURE_VERSION } from '../webhooks.constants';

@Injectable()
export class WebhookSignatureService {
  sign(
    secret: string,

    timestamp: string,

    rawBody: string,
  ): string {
    const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');

    return `${WEBHOOK_SIGNATURE_VERSION}=${digest}`;
  }

  verify(
    secret: string,

    timestamp: string,

    rawBody: string,

    suppliedSignature: string,
  ): boolean {
    const expected = this.sign(secret, timestamp, rawBody);

    const expectedBuffer = Buffer.from(expected, 'utf8');

    const suppliedBuffer = Buffer.from(suppliedSignature, 'utf8');

    if (expectedBuffer.length !== suppliedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, suppliedBuffer);
  }
}
