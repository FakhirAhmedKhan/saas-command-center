import {
  ApiProperty,
} from '@nestjs/swagger';

export class PublicHealthResponseDto {
  @ApiProperty({
    example: 'ok',
  })
  status!: 'ok';

  @ApiProperty({
    example:
      '2026-08-07T01:18:43.237Z',
  })
  timestamp!: string;
}

export class DatabaseReadinessDto {
  @ApiProperty({
    example: 'up',
  })
  status!:
    | 'up'
    | 'down';

  @ApiProperty({
    example: 73,
  })
  responseTimeMs!: number;
}

export class ReadinessResponseDto {
  @ApiProperty({
    example: 'ready',
  })
  status!: 'ready';

  @ApiProperty({
    example:
      'command-center-api',
  })
  service!: string;

  @ApiProperty({
    example: '0.1.0',
  })
  version!: string;

  @ApiProperty({
    example: 'development',
  })
  environment!: string;

  @ApiProperty({
    example:
      '2026-08-07T01:18:43.237Z',
  })
  timestamp!: string;

  @ApiProperty({
    type:
      DatabaseReadinessDto,
  })
  database!:
    DatabaseReadinessDto;
}