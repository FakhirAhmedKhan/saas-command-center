import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min } from 'class-validator';
import { BlockerStatus, DevelopmentTemplateType, WorkItemPriority } from 'src/generated/prisma/enums';

export enum ActiveTaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
}

export class CreateMilestoneDto {
  @ApiProperty({ example: 'Backend foundation' })
  @IsString()
  @Length(2, 160)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;

  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {}

export class CreateTaskDto {
  @ApiProperty({ example: 'Create authentication module' })
  @IsString()
  @Length(2, 200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;

  @ApiPropertyOptional({
    enum: WorkItemPriority,
    default: WorkItemPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(WorkItemPriority)
  priority?: WorkItemPriority;

  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class ChangeTaskStatusDto {
  @ApiProperty({ enum: ActiveTaskStatus })
  @IsEnum(ActiveTaskStatus)
  status!: ActiveTaskStatus;
}

export class SkipWorkItemDto {
  @ApiProperty({
    example: 'Removed from the current project scope',
  })
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class ReorderItemsDto {
  @ApiProperty({
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, {
    each: true,
  })
  orderedIds!: string[];
}

export class MoveTaskDto {
  @ApiProperty()
  @IsUUID()
  targetMilestoneId!: string;

  @ApiPropertyOptional({
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateBlockerDto {
  @ApiProperty({
    example: 'Waiting for production API credentials',
  })
  @IsString()
  @Length(2, 200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;

  @ApiPropertyOptional({
    enum: WorkItemPriority,
    default: WorkItemPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(WorkItemPriority)
  severity?: WorkItemPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  milestoneId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string | null;
}

export class UpdateBlockerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;

  @ApiPropertyOptional({
    enum: WorkItemPriority,
  })
  @IsOptional()
  @IsEnum(WorkItemPriority)
  severity?: WorkItemPriority;
}

export class ResolveBlockerDto {
  @ApiProperty({
    example: 'Credentials were issued by the provider.',
  })
  @IsString()
  @Length(3, 10_000)
  resolution!: string;
}

export class BlockerQueryDto {
  @ApiPropertyOptional({
    enum: BlockerStatus,
  })
  @IsOptional()
  @IsEnum(BlockerStatus)
  status?: BlockerStatus;

  @ApiPropertyOptional({
    enum: WorkItemPriority,
  })
  @IsOptional()
  @IsEnum(WorkItemPriority)
  severity?: WorkItemPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 50,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class ApplyDevelopmentTemplateDto {
  @ApiProperty({
    enum: DevelopmentTemplateType,
  })
  @IsEnum(DevelopmentTemplateType)
  template!: DevelopmentTemplateType;

  @ApiPropertyOptional({
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value as unknown;
  })
  @IsBoolean()
  replaceExisting?: boolean;
}
