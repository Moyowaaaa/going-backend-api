import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  /**
   * Ticket type to buy. It must be PUBLISHED, belong to a PUBLISHED event that
   * has not ended, and be inside its own sales window.
   * @example d4a8c1e2-6b33-4a19-9f70-12ab34cd56ef
   */
  @IsUUID()
  ticketTypeId: string;

  /**
   * How many of this ticket type to buy.
   * @example 2
   */
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  /**
   * Lines in the order. At least one, and no ticket type may repeat.
   * Every line must use the same currency.
   * @example [{"ticketTypeId":"d4a8c1e2-6b33-4a19-9f70-12ab34cd56ef","quantity":2}]
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: CreateOrderItemDto) => item.ticketTypeId)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
