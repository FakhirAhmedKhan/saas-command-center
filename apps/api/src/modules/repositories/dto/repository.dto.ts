import { IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CompleteGithubSetupDto {
  @IsString()
  @MaxLength(200)
  installState!: string;

  @IsString()
  @Matches(/^\d+$/)
  installationId!: string;
}

export class CompleteGithubCallbackDto {
  @IsString()
  @MaxLength(500)
  code!: string;

  @IsString()
  @MaxLength(200)
  state!: string;
}

export class LinkRepositoryApplicationDto {
  @IsUUID()
  applicationId!: string;
}

export class CompletePersonalGithubSetupDto {
  @IsString()
  @MaxLength(200)
  installState!: string;

  @IsString()
  @Matches(/^\d+$/)
  installationId!: string;
}

export class CompletePersonalGithubCallbackDto {
  @IsString()
  @MaxLength(500)
  code!: string;

  @IsString()
  @MaxLength(200)
  state!: string;
}
