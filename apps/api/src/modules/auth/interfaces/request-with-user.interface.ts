import type { AuthenticatedUser } from './authenticated-user.interface';
import type { FastifyRequest } from 'fastify';

export interface RequestWithUser extends FastifyRequest {
  user: AuthenticatedUser;
}
