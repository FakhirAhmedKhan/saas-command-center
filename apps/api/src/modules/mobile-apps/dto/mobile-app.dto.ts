/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { MobileFramework, MobilePlatform } from 'src/generated/prisma/enums';

export class CreateMobileAppDto {
  @ApiProperty({
    example: 'Karwa Passenger',
  })
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty({
    enum: MobilePlatform,
    example: MobilePlatform.ANDROID,
  })
  @IsEnum(MobilePlatform)
  platform!: MobilePlatform;

  @ApiProperty({
    enum: MobileFramework,
    example: MobileFramework.ANDROID_NATIVE,
  })
  @IsEnum(MobileFramework)
  framework!: MobileFramework;

  @ApiPropertyOptional({
    example: 'com.karwa.app',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  packageId?: string | null;

  @ApiPropertyOptional({
    example: 'com.karwa.app',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bundleId?: string | null;

  @ApiPropertyOptional({
    example: '26',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  minOsVersion?: string | null;

  @ApiPropertyOptional({
    example: '36',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetOsVersion?: string | null;

  @ApiPropertyOptional({
    example: '6.14.0',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  currentVersion?: string | null;

  @ApiPropertyOptional({
    example: '815',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  currentBuildNumber?: string | null;
}

export class UpdateMobileAppDto extends PartialType(CreateMobileAppDto) {}
