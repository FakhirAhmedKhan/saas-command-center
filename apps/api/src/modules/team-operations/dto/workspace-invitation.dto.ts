import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsEmail, IsEnum, IsOptional } from 'class-validator';

import { WorkspaceInvitationStatus, WorkspaceRole } from '../../../generated/prisma/client';

export class CreateWorkspaceInvitationDto {
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

export class InvitationListQueryDto {
  @ApiPropertyOptional({
    enum: WorkspaceInvitationStatus,
  })
  @IsOptional()
  @IsEnum(WorkspaceInvitationStatus)
  status?: WorkspaceInvitationStatus;
}
