import {
  WebhookSignatureService,
} from './webhook-signature.service';

describe(
  WebhookSignatureService.name,
  () => {
    const service =
      new WebhookSignatureService();

    it(
      'creates a verifiable signature',
      () => {
        const secret =
          'test-secret';

        const timestamp =
          '1786068000';

        const body =
          '{"id":"event-1"}';

        const signature =
          service.sign(
            secret,
            timestamp,
            body,
          );

        expect(
          service.verify(
            secret,
            timestamp,
            body,
            signature,
          ),
        ).toBe(true);
      },
    );

    it(
      'rejects modified payloads',
      () => {
        const signature =
          service.sign(
            'secret',
            '123',
            '{"value":1}',
          );

        expect(
          service.verify(
            'secret',
            '123',
            '{"value":2}',
            signature,
          ),
        ).toBe(false);
      },
    );
  },
);