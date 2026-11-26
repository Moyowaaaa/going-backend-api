import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';

import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
import { OrderResponse } from './dto/order.response.js';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuthGuard } from '../auth/guards/auth.guards.js';
import { ApiErrorExamples } from '../common/swagger/api-error.js';
import { orderExample } from '../common/swagger/samples.js';
import { ApiControllerTag } from '../common/decorators/api-controller-tag.decorator.js';
import {
  ApiCreate,
  ApiGet,
  ApiPaginatedList,
} from '../common/decorators/api-operation.decorator.js';
import {
  ApiConflict,
  ApiNotFound,
  ApiValidationError,
} from '../common/decorators/api-error.decorator.js';

const { items: _orderItems, ...orderListExample } = orderExample;

@UseGuards(AuthGuard)
@ApiControllerTag('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiPaginatedList({
    summary: 'List your orders',
    description:
      'Returns orders owned by the signed-in user, newest first. Pass q to match the reference (case-insensitive) and status to keep one order status. Paginated with page and limit. This list is the order rows only; line items and payments come from GET /orders/:id.',
    responseDescription: "One page of the caller's orders.",
    model: OrderResponse,
    example: [orderListExample],
    protected: true,
  })
  @ApiValidationError(
    'page, limit, or status failed validation.',
    'status must be one of the following values: PENDING, PAID, EXPIRED, CANCELLED, REFUNDED',
  )
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: ListOrdersDto,
  ) {
    return this.ordersService.findAll(userId, query);
  }

  @Get(':id')
  @ApiGet({
    summary: 'Get an order',
    description:
      'Returns one order owned by the signed-in user, with its line items and payments.',
    responseDescription: 'The order.',
    model: OrderResponse,
    example: orderExample,
    protected: true,
  })
  @ApiParam({ name: 'id', format: 'uuid', example: orderExample.id })
  @ApiNotFound(
    'No order with this id belongs to the signed-in user.',
    'Order not found.',
  )
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.findOne(id, userId);
  }

  @Post()
  @ApiCreate({
    summary: 'Create an order',
    description:
      'Creates a PENDING order for the signed-in user and reserves the requested quantities against each ticket type. Prices and the total come from the database, not from the request. The order expires after 15 minutes, when the held quantities are released. Every line must be a PUBLISHED ticket type on a PUBLISHED event that has not ended and is inside its sales window, and all lines must share one currency. Availability is quantity minus sold minus reserved.',
    responseDescription: 'Order created and quantities reserved.',
    model: OrderResponse,
    example: orderExample,
    protected: true,
  })
  @ApiErrorExamples(
    400,
    'The body failed validation, or a line cannot be bought.',
    {
      validation: {
        summary: 'Invalid body',
        message: ['items must contain at least 1 elements'],
        error: 'Bad Request',
      },
      notPublished: {
        summary: 'Ticket type is still a draft',
        message: 'General Admission is not available for purchase.',
        error: 'Bad Request',
      },
      eventNotPublished: {
        summary: 'Event is not published',
        message: 'Tickets for this event are not available.',
        error: 'Bad Request',
      },
      eventEnded: {
        summary: 'Event is over',
        message: 'This event has already ended.',
        error: 'Bad Request',
      },
      salesNotStarted: {
        summary: 'Sales window has not opened',
        message: 'General Admission sales have not started.',
        error: 'Bad Request',
      },
      salesEnded: {
        summary: 'Sales window has closed',
        message: 'General Admission sales have ended.',
        error: 'Bad Request',
      },
      mixedCurrency: {
        summary: 'Lines use different currencies',
        message: 'All tickets in an order must use the same currency.',
        error: 'Bad Request',
      },
    },
  )
  @ApiNotFound(
    'At least one ticketTypeId does not exist.',
    'One or more ticket types could not be found.',
  )
  @ApiConflict(
    'A ticket type ran out between the price check and the reservation.',
    'One or more ticket types no longer have sufficient availability.',
  )
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Post(':id/cancel')
  @ApiCreate({
    summary: 'Cancel a pending order',
    description:
      'Releases the reserved ticket quantities immediately. Paid, expired and already cancelled orders cannot be cancelled.',
    responseDescription: 'Cancellation result.',
    example: { message: 'Order cancelled' },
    protected: true,
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNotFound('Order not found.', 'Order not found.')
  @ApiConflict(
    'The reservation could not be released.',
    'Could not release the reservation for this order.',
  )
  cancel(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.cancel(orderId, userId);
  }
}
