import type { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { WorkspaceMemberDetails } from '../service/workspace-members.service';

export interface WorkspaceRequest
  extends RequestWithUser {
  workspaceMember: WorkspaceMemberDetails;
}