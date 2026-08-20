import { AuthSessionsService } from '../services/auth-sessions.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [AuthSessionsService],
  exports: [AuthSessionsService],
})
export class AuthSessionsModule {}
