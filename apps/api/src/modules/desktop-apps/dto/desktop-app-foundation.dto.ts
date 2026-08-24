import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DesktopArchitecture, DesktopFramework, DesktopPlatform } from 'src/generated/prisma/enums';

export class DesktopApplicationMetadataDto {
  @ApiProperty({
    enum: DesktopPlatform,
  })
  @IsEnum(DesktopPlatform)
  platform!: DesktopPlatform;

  @ApiProperty({
    enum: DesktopFramework,
  })
  @IsEnum(DesktopFramework)
  framework!: DesktopFramework;

  @ApiProperty({
    enum: DesktopArchitecture,
  })
  @IsEnum(DesktopArchitecture)
  architecture!: DesktopArchitecture;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  packageName?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  currentVersion?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  currentBuildNumber?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  minimumOsVersion?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  updateChannel?: string | null;
}

export class UpdateDesktopApplicationMetadataDto extends PartialType(DesktopApplicationMetadataDto) {}
