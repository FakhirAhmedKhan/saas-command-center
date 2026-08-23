import { DesktopTelemetryProvider } from 'src/generated/prisma/enums';
import {
    IsEnum,
    IsNotEmpty,
    IsString,
    IsUrl,
    MaxLength,
    MinLength,
} from 'class-validator';
import {
    ApiProperty,
} from '@nestjs/swagger';

export class ConnectDesktopTelemetryDto {
    @ApiProperty({ enum: DesktopTelemetryProvider })
    @IsEnum(DesktopTelemetryProvider)
    provider!: DesktopTelemetryProvider;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    externalProjectId!: string;

    @ApiProperty({
        description:
            'HTTPS endpoint exposing the normalized desktop telemetry snapshot contract.',
    })
    @IsString()
    @MinLength(4)
    @MaxLength(2048)
    endpointUrl!: string;

    @ApiProperty({ writeOnly: true })
    @IsString()
    @MinLength(8)
    @MaxLength(4096)
    secret!: string;
}