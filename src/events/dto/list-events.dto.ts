import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { EventCategory } from '../../generated/prisma/enums.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

/**
 * Query for the public event listing. q and category are validated in the same
 * place the other filters are, so an unknown category still answers with the
 * "Unknown event category" body the API already documented.
 */
export class ListEventsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive substring matched against the event title.',
    example: 'jazz',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description:
      'Category filter. Replaces the title search when it is present. Unknown values answer 400 "Unknown event category".',
    enum: Object.values(EventCategory),
    example: EventCategory.MUSIC,
  })
  @IsOptional()
  @IsString()
  category?: string;
}
