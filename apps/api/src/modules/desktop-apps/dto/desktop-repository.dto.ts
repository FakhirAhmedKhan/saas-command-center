import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LinkDesktopRepositoryDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Existing repository connection ID',
  })
  @IsUUID()
  repositoryId!: string;
}
