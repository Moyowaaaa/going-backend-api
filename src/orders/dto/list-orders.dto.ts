import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../../generated/prisma/enums.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class ListOrdersDto extends PaginationDto {
  /**
   * Case-insensitive substring matched against the order reference.
   * @example "8f1c2b3a"
   */
  @ApiPropertyOptional({
    description:
      'Case-insensitive substring matched against the order reference.',
    example: '8f1c2b3a',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Only orders in this status.',
    enum: Object.values(OrderStatus),
    example: OrderStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
