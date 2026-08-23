import type { IngestGithubMobileBuildDto } from '../dto/mobile-build.dto';
import { MobileBuildStatus, MobilePlatform } from 'src/generated/prisma/enums';

interface GithubWorkflowRun {
  id: number | string;

  status: string;

  conclusion: null | string;

  head_sha: string;

  head_branch: string;

  run_started_at: string | null;

  updated_at: string | null;
}

export function mapGithubWorkflowRunToMobileBuild(repositoryId: string, platform: MobilePlatform, run: GithubWorkflowRun): IngestGithubMobileBuildDto {
  return {
    repositoryId,

    workflowRunId: String(run.id),

    commitSha: run.head_sha,

    branch: run.head_branch,

    platform,

    status: mapStatus(run),

    startedAt: run.run_started_at,

    completedAt: run.status === 'completed' ? run.updated_at : null,
  };
}

function mapStatus(run: GithubWorkflowRun): MobileBuildStatus {
  if (run.status === 'queued') {
    return MobileBuildStatus.QUEUED;
  }

  if (run.status === 'in_progress') {
    return MobileBuildStatus.BUILDING;
  }

  switch (run.conclusion) {
    case 'success':
      return MobileBuildStatus.SUCCESS;

    case 'cancelled':
      return MobileBuildStatus.CANCELLED;

    default:
      return MobileBuildStatus.FAILED;
  }
}
