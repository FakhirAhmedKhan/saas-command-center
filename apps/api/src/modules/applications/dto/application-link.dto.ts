import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsString, IsUrl, Length } from 'class-validator';
import { ApplicationLinkType } from 'src/generated/prisma/enums';

export class CreateApplicationLinkDto {
  @ApiProperty({
    example: 'Production website',
  })
  @IsString()
  @Length(1, 80)
  label!: string;

  @ApiProperty({
    enum: ApplicationLinkType,
  })
  @IsEnum(ApplicationLinkType)
  type!: ApplicationLinkType;

  @ApiProperty({
    example: 'https://example.com',
  })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    {
      message: 'url must be a valid HTTP or HTTPS URL',
    },
  )
  url!: string;
}

export class UpdateApplicationLinkDto extends PartialType(CreateApplicationLinkDto) {}
