import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';

import { DesktopArchitecture, DesktopFramework, DesktopPlatform } from 'src/generated/prisma/enums';

export class CreateDesktopAppDto {
  @ApiProperty({
    example: 'Command Center Desktop',
  })
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty({
    enum: DesktopPlatform,
    example: DesktopPlatform.CROSS_PLATFORM,
  })
  @IsEnum(DesktopPlatform)
  platform!: DesktopPlatform;

  @ApiProperty({
    enum: DesktopFramework,
    example: DesktopFramework.ELECTRON,
  })
  @IsEnum(DesktopFramework)
  framework!: DesktopFramework;

  @ApiProperty({
    enum: DesktopArchitecture,
    example: DesktopArchitecture.X64,
  })
  @IsEnum(DesktopArchitecture)
  architecture!: DesktopArchitecture;

  @ApiPropertyOptional({
    example: 'com.commandcenter.desktop',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  packageName?: string | null;

  @ApiPropertyOptional({
    example: '2.4.0',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  currentVersion?: string | null;

  @ApiPropertyOptional({
    example: '184',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  currentBuildNumber?: string | null;

  @ApiPropertyOptional({
    example: 'Windows 10',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  minimumOsVersion?: string | null;

  @ApiPropertyOptional({
    example: 'stable',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  updateChannel?: string | null;
}

export class UpdateDesktopAppDto extends PartialType(CreateDesktopAppDto) {}
