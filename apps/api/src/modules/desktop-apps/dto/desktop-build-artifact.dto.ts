import { DesktopArchitecture, DesktopBuildArtifactType, DesktopPlatform } from 'src/generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Length, MaxLength, Min } from 'class-validator';

export class IngestDesktopBuildArtifactDto {
  @ApiProperty({
    example: 'github-artifact-812933',
  })
  @IsString()
  @Length(1, 255)
  providerArtifactId!: string;

  @ApiProperty({
    enum: DesktopPlatform,
  })
  @IsEnum(DesktopPlatform)
  platform!: DesktopPlatform;

  @ApiProperty({
    enum: DesktopArchitecture,
  })
  @IsEnum(DesktopArchitecture)
  architecture!: DesktopArchitecture;

  @ApiProperty({
    enum: DesktopBuildArtifactType,
  })
  @IsEnum(DesktopBuildArtifactType)
  type!: DesktopBuildArtifactType;

  @ApiProperty({
    example: 'CommandCenter-2.0.0-x64.msi',
  })
  @IsString()
  @Length(1, 1024)
  fileName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  checksum?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({
    require_protocol: true,
    protocols: ['https'],
  })
  externalUrl?: string | null;
}
