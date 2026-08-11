import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { RepositoryBranchQueryDto, RepositoryDiffQueryDto, RepositoryFileQueryDto, RepositorySearchQueryDto } from '../dto/code-explorer.dto';
import { CodeExplorerService } from '../services/code-explorer.service';
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Repository Code Explorer')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/repositories/:repositoryId/code')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class CodeExplorerController {
  constructor(private readonly codeExplorerService: CodeExplorerService) {}

  @Get('branches')
  listBranches(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('repositoryId', ParseUUIDPipe)
    repositoryId: string,
  ) {
    return this.codeExplorerService.listBranches(workspaceId, repositoryId);
  }

  @Get('tree')
  getTree(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('repositoryId', ParseUUIDPipe)
    repositoryId: string,

    @Query()
    query: RepositoryBranchQueryDto,
  ) {
    return this.codeExplorerService.getTree(workspaceId, repositoryId, query.branch);
  }

  @Get('file')
  getFile(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('repositoryId', ParseUUIDPipe)
    repositoryId: string,

    @Query()
    query: RepositoryFileQueryDto,
  ) {
    return this.codeExplorerService.getFile(workspaceId, repositoryId, query.path, query.branch);
  }

  @Get('search')
  search(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('repositoryId', ParseUUIDPipe)
    repositoryId: string,

    @Query()
    query: RepositorySearchQueryDto,
  ) {
    return this.codeExplorerService.search(workspaceId, repositoryId, query.query, query.branch);
  }

  @Get('diff')
  getDiff(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('repositoryId', ParseUUIDPipe)
    repositoryId: string,

    @Query()
    query: RepositoryDiffQueryDto,
  ) {
    return this.codeExplorerService.getDiff(workspaceId, repositoryId, query.base, query.head, query.path);
  }
}
