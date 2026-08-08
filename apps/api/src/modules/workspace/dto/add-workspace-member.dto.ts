import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { WorkspaceRole } from '../../../generated/prisma/client';

export class AddWorkspaceMemberDto {
  @ApiProperty({
    example: 'developer@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    enum: WorkspaceRole,
    default: WorkspaceRole.VIEWER,
  })
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
}
