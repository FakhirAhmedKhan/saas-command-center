import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RepositoryBranchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branch?: string;
}

export class RepositoryFileQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branch?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  path!: string;
}

export class RepositorySearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branch?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  query!: string;
}

export class RepositoryDiffQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  base!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  head!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  path!: string;
}
