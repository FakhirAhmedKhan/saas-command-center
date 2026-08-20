import type { AnalyzeRepositoryInput, ImportApplicationSelection, ImportWorkspaceFromGithubInput } from '@command-center/shared-types';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';

export class AnalyzeRepositoryDto implements AnalyzeRepositoryInput {
  @IsInt()
  @Min(1)
  repositoryId!: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  installationId?: string;
}

export class ImportApplicationCommandsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  dev?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  build?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  start?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  test?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lint?: string;
}

export class ImportApplicationSelectionDto implements ImportApplicationSelection {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsString()
  @MaxLength(500)
  rootDirectory!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  framework?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  language?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportApplicationCommandsDto)
  commands?: ImportApplicationCommandsDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({
    each: true,
  })
  technologies?: string[];
}

class ImportWorkspaceDetailsDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string | null;
}

export class ImportWorkspaceFromGithubDto implements ImportWorkspaceFromGithubInput {
  @IsString()
  @Matches(/^\d+$/)
  installationId!: string;

  @IsInt()
  @Min(1)
  repositoryId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  defaultBranch?: string;

  @ValidateNested()
  @Type(() => ImportWorkspaceDetailsDto)
  workspace!: ImportWorkspaceDetailsDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({
    each: true,
  })
  @Type(() => ImportApplicationSelectionDto)
  applications!: ImportApplicationSelectionDto[];
}
