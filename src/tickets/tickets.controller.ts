import { Controller, Get, Param } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { TicketsService } from './tickets.service.js';
import { publishedTicketExample } from '../common/swagger/samples.js';
import { TicketResponse } from './dto/ticket.response.js';
import { ApiControllerTag } from '../common/decorators/api-controller-tag.decorator.js';
import { ApiGet } from '../common/decorators/api-operation.decorator.js';
import { ApiNotFound } from '../common/decorators/api-error.decorator.js';

@ApiControllerTag('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketService: TicketsService) {}

  @Get(':ticketId')
  @ApiGet({
    summary: 'Get a published ticket type',
    description: 'Returns one ticket type only when its status is PUBLISHED.',
    responseDescription: 'The published ticket type.',
    model: TicketResponse,
    example: publishedTicketExample,
  })
  @ApiParam({
    name: 'ticketId',
    format: 'uuid',
    example: publishedTicketExample.id,
  })
  @ApiNotFound('No published ticket type uses this id.', 'Ticket not found')
  findOne(@Param('ticketId') ticketId: string) {
    return this.ticketService.findOneById(ticketId);
  }
}
