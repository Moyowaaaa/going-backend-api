import { ApiProperty } from '@nestjs/swagger';
import { orderExample } from '../../common/swagger/samples.js';
import {
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
} from '../../generated/prisma/enums.js';

export class OrderItemResponse {
  @ApiProperty({ format: 'uuid', example: orderExample.items[0].id })
  id: string;

  @ApiProperty({ format: 'uuid', example: orderExample.items[0].orderId })
  orderId: string;

  @ApiProperty({ format: 'uuid', example: orderExample.items[0].ticketTypeId })
  ticketTypeId: string;

  @ApiProperty({ example: orderExample.items[0].quantity })
  quantity: number;

  @ApiProperty({
    description: 'Ticket price in minor units, captured when the order was created.',
    example: orderExample.items[0].unitPrice,
  })
  unitPrice: number;

  @ApiProperty({
    description: 'unitPrice multiplied by quantity, in minor units.',
    example: orderExample.items[0].subtotal,
  })
  subtotal: number;

  @ApiProperty({ format: 'date-time', example: orderExample.items[0].createdAt })
  createdAt: string;
}

export class OrderResponse {
  @ApiProperty({ format: 'uuid', example: orderExample.id })
  id: string;

  @ApiProperty({
    description: 'Public reference for the order. Unique.',
    format: 'uuid',
    example: orderExample.reference,
  })
  reference: string;

  @ApiProperty({ format: 'uuid', example: orderExample.userId })
  userId: string;

  @ApiProperty({
    enum: Object.values(OrderStatus),
    enumName: 'OrderStatus',
    example: orderExample.status,
  })
  status: string;

  @ApiProperty({
    description: 'Order total in minor units, calculated from database prices.',
    example: orderExample.total,
  })
  total: number;

  @ApiProperty({ example: orderExample.currency })
  currency: string;

  @ApiProperty({
    description:
      'When the reservation lapses. After this, the held quantities are released back to the ticket types.',
    format: 'date-time',
    example: orderExample.expiresAt,
  })
  expiresAt: string;

  @ApiProperty({ type: OrderItemResponse, isArray: true })
  items: OrderItemResponse[];

  @ApiProperty({ format: 'date-time', example: orderExample.createdAt })
  createdAt: string;

  @ApiProperty({ format: 'date-time', example: orderExample.updatedAt })
  updatedAt: string;
}

export class PaymentResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  orderId: string;

  @ApiProperty({
    enum: Object.values(PaymentProvider),
    enumName: 'PaymentProvider',
  })
  provider: string;

  @ApiProperty({ description: "The provider's own reference for the payment." })
  providerReference: string;

  @ApiProperty({
    enum: Object.values(PaymentStatus),
    enumName: 'PaymentStatus',
  })
  status: string;

  @ApiProperty({ description: 'Amount in minor units.' })
  amount: number;

  @ApiProperty({ example: orderExample.currency })
  currency: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  paidAt: string | null;
}
