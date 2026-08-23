import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsString, MaxLength } from 'class-validator';
import { MobileTelemetryProvider } from 'src/generated/prisma/enums';

export class ConnectMobileTelemetryDto {
  @ApiProperty({
    enum: MobileTelemetryProvider,
  })
  @IsEnum(MobileTelemetryProvider)
  provider!: MobileTelemetryProvider;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  externalProjectId!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'string',
    },
  })
  @IsObject()
  config!: Record<string, string>;
}
