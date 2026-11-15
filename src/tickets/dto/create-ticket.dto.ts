import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { TicketStatus } from '../../generated/prisma/enums.js';

export class CreateTicketDto {
  /**
   * Ticket name. Unique per event.
   * @example "General Admission"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  /**
   * What this ticket includes.
   * @example "Standing access for the full evening."
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /**
   * Integer price in the ticket currency.
   * @example 15000
   */
  @IsInt()
  @Min(0)
  price: number;

  /**
   * ISO 4217 currency code. Defaults to NGN when omitted.
   * @example NGN
   */
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  /**
   * How many of this ticket can be sold.
   * @example 200
   */
  @IsInt()
  @Min(1)
  quantity: number;

  /**
   * When sales open, as an ISO-8601 date-time.
   * @example 2026-11-15T00:00:00.000Z
   */
  @IsOptional()
  @IsDateString()
  salesStart?: string;

  /**
   * When sales close, as an ISO-8601 date-time.
   * @example 2026-11-20T17:00:00.000Z
   */
  @IsOptional()
  @IsDateString()
  salesEnd?: string;

  /**
   * Ticket status. Defaults to DRAFT when omitted.
   * @example DRAFT
   */
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
