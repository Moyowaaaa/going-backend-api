import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service.js';
import { ApiErrorResponse } from '../common/swagger/api-error.js';
import { ApiWrappedResponse } from '../common/swagger/api-wrapped-response.js';
import {
  publishedTicketExample,
  ticketExample,
} from '../common/swagger/samples.js';
import { TicketResponse } from './dto/ticket.response.js';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketService: TicketsService) {}

  @Get()
  @ApiOperation({
    summary: 'List ticket types',
    description:
      'Returns every ticket type, including drafts. This list is not limited to published tickets and is not paginated.',
  })
  @ApiWrappedResponse({
    status: HttpStatus.OK,
    description: 'All ticket types.',
    model: TicketResponse,
    isArray: true,
    example: [ticketExample],
  })
  findAll() {
    return this.ticketService.findAllTickets();
  }

  @Get(':ticketId')
  @ApiOperation({
    summary: 'Get a published ticket type',
    description: 'Returns one ticket type only when its status is PUBLISHED.',
  })
  @ApiParam({
    name: 'ticketId',
    format: 'uuid',
    example: publishedTicketExample.id,
  })
  @ApiWrappedResponse({
    status: HttpStatus.OK,
    description: 'The published ticket type.',
    model: TicketResponse,
    example: publishedTicketExample,
  })
  @ApiErrorResponse(
    HttpStatus.NOT_FOUND,
    'No published ticket type uses this id.',
    `No event with slug: ${publishedTicketExample.id} found`,
    'Not Found',
  )
  findOne(@Param('ticketId') ticketId: string) {
    return this.ticketService.findOneById(ticketId);
  }
}
