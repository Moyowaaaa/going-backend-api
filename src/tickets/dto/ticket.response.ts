import { ApiProperty } from '@nestjs/swagger';
import { TicketTypeStatus } from '../../generated/prisma/enums.js';
import { ticketExample } from '../../common/swagger/samples.js';

export class TicketResponse {
  @ApiProperty({ format: 'uuid', example: ticketExample.id })
  id: string;

  @ApiProperty({ example: ticketExample.name })
  name: string;

  @ApiProperty({ nullable: true, example: ticketExample.description })
  description: string | null;

  @ApiProperty({
    description: 'Integer price in the ticket currency.',
    example: ticketExample.price,
  })
  price: number;

  @ApiProperty({
    description: 'ISO 4217 currency code. Defaults to NGN.',
    example: ticketExample.currency,
  })
  currency: string;

  @ApiProperty({ example: ticketExample.quantity })
  quantity: number;

  @ApiProperty({
    description: 'Number of tickets sold. Starts at 0.',
    example: ticketExample.sold,
  })
  sold: number;

  @ApiProperty({
    description:
      'Quantity held by pending orders and not yet paid for. Counts against quantity alongside sold, so availability is quantity - sold - reserved.',
    example: ticketExample.reserved,
  })
  reserved: number;

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    example: ticketExample.salesStart,
  })
  salesStart: string | null;

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    example: ticketExample.salesEnd,
  })
  salesEnd: string | null;

  @ApiProperty({ format: 'uuid', example: ticketExample.eventId })
  eventId: string;

  @ApiProperty({
    enum: Object.values(TicketTypeStatus),
    enumName: 'TicketTypeStatus',
    example: ticketExample.status,
  })
  status: string;

  @ApiProperty({ format: 'date-time', example: ticketExample.createdAt })
  createdAt: string;

  @ApiProperty({ format: 'date-time', example: ticketExample.updatedAt })
  updatedAt: string;
}
