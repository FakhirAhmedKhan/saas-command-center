import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnalyzeRepositoryDto, ImportWorkspaceFromGithubDto } from '../dto/repository-import.dto';
import { CompletePersonalGithubCallbackDto, CompletePersonalGithubSetupDto } from '../dto/repository.dto';
import { PersonalGithubConnectService } from '../services/personal-github-connect.service';
import { PersonalRepositoriesService } from '../services/personal-repositories.service';
import { RepositoryAnalyzerService } from '../services/repository-analyzer.service';
import { RepositoryImportService } from '../services/repository-import.service';
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/modules/auth/interfaces/request-with-user.interface';

@ApiTags('Workspace Import from GitHub')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class RepositoryImportController {
  constructor(
    private readonly personalGithubConnect: PersonalGithubConnectService,
    private readonly personalRepositories: PersonalRepositoriesService,
    private readonly repositoryAnalyzer: RepositoryAnalyzerService,
    private readonly repositoryImport: RepositoryImportService,
  ) {}

  @Post('repositories/github/personal/connect')
  @ApiOperation({
    summary: 'Begin a personal GitHub App installation before a workspace exists',
  })
  beginConnect(
    @Req()
    request: RequestWithUser,
  ) {
    return this.personalGithubConnect.begin(request.user.id);
  }

  @Post('repositories/github/personal/setup')
  @ApiOperation({
    summary: 'Complete GitHub App installation setup for a personal connect intent',
  })
  completeSetup(
    @Req()
    request: RequestWithUser,

    @Body()
    dto: CompletePersonalGithubSetupDto,
  ) {
    return this.personalGithubConnect.completeSetup(request.user.id, dto);
  }

  @Post('repositories/github/personal/callback')
  @ApiOperation({
    summary: 'Complete the personal GitHub OAuth callback',
  })
  completeCallback(
    @Req()
    request: RequestWithUser,

    @Body()
    dto: CompletePersonalGithubCallbackDto,
  ) {
    return this.personalGithubConnect.completeCallback(request.user.id, dto);
  }

  @Get('repositories/github/personal')
  @ApiOperation({
    summary: 'List repositories available through the user’s connected GitHub installations',
  })
  listRepositories(
    @Req()
    request: RequestWithUser,
  ) {
    return this.personalRepositories.list(request.user.id);
  }

  @Post('repositories/github/personal/analyze')
  @ApiOperation({
    summary: 'Statically analyze a repository to suggest a workspace and application configuration',
  })
  analyzeRepository(
    @Req()
    request: RequestWithUser,

    @Body()
    dto: AnalyzeRepositoryDto,
  ) {
    return this.repositoryAnalyzer.analyze(request.user.id, dto.repositoryId);
  }

  @Post('workspaces/import/github')
  @ApiOperation({
    summary: 'Create a workspace and applications from a selected GitHub repository',
  })
  importWorkspace(
    @Req()
    request: RequestWithUser,

    @Body()
    dto: ImportWorkspaceFromGithubDto,
  ) {
    return this.repositoryImport.importFromGithub(request.user.id, dto);
  }
}
