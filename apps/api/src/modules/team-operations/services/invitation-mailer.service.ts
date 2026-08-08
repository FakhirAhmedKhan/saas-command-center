import {
  Injectable,
} from '@nestjs/common';

export interface SendInvitationEmailInput {
  email: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  invitationUrl: string;
  expiresAt: Date;
}

export interface InvitationMailResult {
  sent: boolean;
  skipped: boolean;
  error?: string;
}

export abstract class InvitationMailer {
  abstract send(
    input:
      SendInvitationEmailInput,
  ): Promise<InvitationMailResult>;
}

@Injectable()
export class DisabledInvitationMailer
  implements InvitationMailer
{
  async send(
    _input:
      SendInvitationEmailInput,
  ): Promise<InvitationMailResult> {
    return {
      sent: false,
      skipped: true,
    };
  }
}