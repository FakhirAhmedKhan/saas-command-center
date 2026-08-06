/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
    Body,
    Controller,
    Headers,
    HttpCode,
    Post,
    Req,
} from '@nestjs/common';

import {
    ApiExcludeController,
} from '@nestjs/swagger';

import type {
    Request,
} from 'express';
import { AnalyticsIngestionService } from 'src/modules/analytics-ingestion/services/analytics-ingestion.service';


@ApiExcludeController()
@Controller('collect')
export class AnalyticsIngestionController {
    constructor(
        private readonly ingestionService:
            AnalyticsIngestionService,
    ) { }

    @Post()
    @HttpCode(202)
    collect(
        @Body()
        body: unknown,

        @Headers('origin')
        origin:
            string | undefined,

        @Headers('user-agent')
        userAgent:
            string | undefined,

        @Headers('cf-ipcountry')
        cloudflareCountry:
            string | undefined,

        @Headers(
            'x-vercel-ip-country',
        )
        vercelCountry:
            string | undefined,

        @Req()
        request: Request,
    ) {
        return this.ingestionService
            .collect(body, {
                origin,

                userAgent,

                countryCode:
                    cloudflareCountry ??
                    vercelCountry,

                ipAddress:
                    request.ip ??
                    request.socket
                        .remoteAddress,
            });
    }
}