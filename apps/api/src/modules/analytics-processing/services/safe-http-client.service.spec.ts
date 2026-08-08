import {
    BadRequestException,
} from '@nestjs/common';
import { SafeHttpClientService } from 'src/modules/monitoring/services/safe-http-client.service';



describe(
    SafeHttpClientService.name,
    () => {
        let service:
            SafeHttpClientService;

        beforeEach(
            () => {
                service =
                    new SafeHttpClientService();
            },
        );

        it.each([
            'http://127.0.0.1:4000/health',

            'http://0.0.0.0/health',

            'http://localhost/health',

            'http://169.254.169.254/latest/meta-data',

            'http://[::1]/health',

            'http://metadata.google.internal/',
        ])(
            'blocks unsafe destination %s',
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

        it(
            'rejects embedded credentials',
            async () => {
                await expect(
                    service.validateUrl(
                        'https://user:password@example.com/health',
                    ),
                ).rejects.toBeInstanceOf(
                    BadRequestException,
                );
            },
        );

        it(
            'rejects non-HTTP protocols',
            async () => {
                await expect(
                    service.validateUrl(
                        'file:///etc/passwd',
                    ),
                ).rejects.toBeInstanceOf(
                    BadRequestException,
                );
            },
        );
    },
);