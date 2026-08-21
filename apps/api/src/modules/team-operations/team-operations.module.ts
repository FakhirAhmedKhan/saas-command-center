import { InvitationResponseController } from './controllers/invitation-response.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { WorkspaceInvitationsController } from './controllers/workspace-invitations.controller';
import { DisabledInvitationMailer, InvitationMailer } from './services/invitation-mailer.service';
import { InvitationTokenService } from './services/invitation-token.service';
import { NotificationService } from './services/notification.service';
import { TeamOperationsCleanupService } from './services/team-operations-cleanup.service';
import { WorkspaceInvitationService } from './services/workspace-invitation.service';
import { SharedRateLimitModule } from '../../common/rate-limit/shared-rate-limit.module';
import { DatabaseModule } from '../../database/database.module';
import { Module } from '@nestjs/common';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';

@Module({
  imports: [WorkspaceMembersModule, DatabaseModule, SharedRateLimitModule],
  controllers: [WorkspaceInvitationsController, InvitationResponseController, NotificationsController],
  providers: [
    InvitationTokenService,

    NotificationService,

    WorkspaceInvitationService,

    TeamOperationsCleanupService,

    {
      provide: InvitationMailer,
      useClass: DisabledInvitationMailer,
    },
  ],

  exports: [NotificationService, WorkspaceInvitationService],
})
export class TeamOperationsModule {}
