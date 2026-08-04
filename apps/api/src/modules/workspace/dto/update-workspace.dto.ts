import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    Length,
    Matches,
} from 'class-validator';

export class UpdateWorkspaceDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Length(2, 120)
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Length(2, 120)
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    slug?: string;
}