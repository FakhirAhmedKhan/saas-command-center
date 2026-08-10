import { WorkspaceMemberDetails } from '../service/workspace-members.service';
import type { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';

export interface WorkspaceRequest extends RequestWithUser {
  workspaceMember: WorkspaceMemberDetails;
}
