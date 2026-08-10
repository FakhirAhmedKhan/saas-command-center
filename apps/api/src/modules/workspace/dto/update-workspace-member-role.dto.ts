import { WorkspaceRole } from '../../../generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateWorkspaceMemberRoleDto {
  @ApiProperty({
    enum: WorkspaceRole,
  })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
