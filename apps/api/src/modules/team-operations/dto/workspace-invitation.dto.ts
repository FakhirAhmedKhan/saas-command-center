import type { CreateWorkspaceInvitationInput, InvitationListQueryInput } from '@command-center/shared-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { WorkspaceInvitationStatus, WorkspaceRole } from '../../../generated/prisma/client';

export class CreateWorkspaceInvitationDto implements CreateWorkspaceInvitationInput {
  @ApiProperty({
    example: 'developer@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    enum: WorkspaceRole,
  })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}

export class InvitationListQueryDto implements InvitationListQueryInput {
  @ApiPropertyOptional({
    enum: WorkspaceInvitationStatus,
  })
  @IsOptional()
  @IsEnum(WorkspaceInvitationStatus)
  status?: WorkspaceInvitationStatus;
}
