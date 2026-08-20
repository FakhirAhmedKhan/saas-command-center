import type { AuthenticatedUser } from './authenticated-user.interface';
import type { Request } from 'express';

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
