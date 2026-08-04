import { Module } from '@nestjs/common';
import { AuthSessionsService } from '../services/auth-sessions.service';

@Module({
  providers: [AuthSessionsService],
  exports: [AuthSessionsService],
})
export class AuthSessionsModule {}