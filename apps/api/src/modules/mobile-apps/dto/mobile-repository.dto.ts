import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LinkMobileRepositoryDto {
  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID()
  repositoryId!: string;
}
