import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkspaceRole } from '../../../generated/prisma/client';

export class UpdateWorkspaceMemberRoleDto {
    @ApiProperty({
        enum: WorkspaceRole,
    })
    @IsEnum(WorkspaceRole)
    role!: WorkspaceRole;
}