import {
  BadRequestException,
} from '@nestjs/common';

import {
  WebhookOutboundClientService,
} from './webhook-outbound-client.service';

describe(
  WebhookOutboundClientService.name,
  () => {
    const service =
      new WebhookOutboundClientService();

    it.each([
      'http://localhost/webhook',
      'http://127.0.0.1/webhook',
      'http://0.0.0.0/webhook',
      'http://10.0.0.1/webhook',
      'http://192.168.1.10/webhook',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]/webhook',
      'http://metadata.google.internal/',
      'file:///etc/passwd',
      'ftp://example.com/webhook',
      'https://user:password@example.com/webhook',
    ])(
      'blocks unsafe URL %s',
      async (
        url,
      ) => {
        await expect(
          service.validateUrl(
            url,
          ),
        ).rejects.toBeInstanceOf(
          BadRequestException,
        );
      },
    );
  },
);