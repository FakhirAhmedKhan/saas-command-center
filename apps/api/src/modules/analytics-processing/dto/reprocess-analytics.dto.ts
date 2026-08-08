import {
    ApiProperty,
} from '@nestjs/swagger';

import {
    IsDateString,
} from 'class-validator';

export class ReprocessAnalyticsDto {
    @ApiProperty({
        example:
            '2026-08-01T00:00:00.000Z',
    })
    @IsDateString()
    from!: string;

    @ApiProperty({
        example:
            '2026-08-08T00:00:00.000Z',
        description:
            'Exclusive range end.',
    })
    @IsDateString()
    to!: string;
}