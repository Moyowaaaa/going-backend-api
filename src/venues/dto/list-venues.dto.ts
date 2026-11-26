import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

/**
* Query for the venue listing. q matches the name or city.
*/
export class ListVenuesDto extends PaginationDto {
@ApiPropertyOptional({
description: 'Case-insensitive substring matched against the venue name and city.',
example: 'lagos',
})
@IsOptional()
@IsString()
q?: string;
}
