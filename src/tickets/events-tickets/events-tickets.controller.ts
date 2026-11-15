import { Body, Controller, Get, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { TicketsService } from '../tickets.service.js';
import { AuthGuard } from '../../auth/guards/auth.guards.js';
import { CreateTicketDto } from '../dto/create-ticket.dto.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { ApiErrorResponse, ApiProtected } from '../../common/swagger/api-error.js';
import { ApiWrappedResponse } from '../../common/swagger/api-wrapped-response.js';
import {
  samples,
  ticketExample,
  publishedTicketExample,
} from '../../common/swagger/samples.js';
import { TicketResponse } from '../dto/ticket.response.js';

@ApiTags('Tickets')
@Controller('events/:eventId/tickets')
export class EventsTicketsController {
  constructor(private readonly ticketService: TicketsService) {}

  @Get()
  @ApiOperation({
    summary: 'List published ticket types for an event',
    description:
      'Returns ticket types for the event whose status is PUBLISHED. An unknown event id returns an empty list.',
  })
  @ApiParam({
    name: 'eventId',
    format: 'uuid',
    example: samples.eventId,
  })
  @ApiWrappedResponse({
    status: HttpStatus.OK,
    description: 'Published ticket types for the event.',
    model: TicketResponse,
    isArray: true,
    example: [publishedTicketExample],
  })
  findAll(@Param('eventId') eventId: string) {
    return this.ticketService.findAll(eventId);
  }

  @Get(':ticketId')
  @ApiOperation({
    summary: 'Get a published ticket type for an event',
    description:
      'Returns the ticket type when it belongs to the event and its status is PUBLISHED.',
  })
  @ApiParam({
    name: 'eventId',
    format: 'uuid',
    example: samples.eventId,
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
    'No published ticket type with this id belongs to the event.',
    `No event with slug: ${publishedTicketExample.id} found`,
    'Not Found',
  )
  findOne(
    @Param('eventId') eventId: string,
    @Param('ticketId') ticketId: string,
  ) {
    return this.ticketService.findOne(ticketId, eventId);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiProtected()
  @ApiOperation({
    summary: 'Create a ticket type',
    description:
      'Creates a ticket type on an event the signed-in user organizes. sold starts at 0. currency defaults to NGN and status defaults to DRAFT when omitted. The name must be unique on that event.',
  })
  @ApiParam({
    name: 'eventId',
    format: 'uuid',
    example: samples.eventId,
  })
  @ApiWrappedResponse({
    status: HttpStatus.CREATED,
    description: 'Ticket type created.',
    model: TicketResponse,
    example: ticketExample,
  })
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    'The body failed validation.',
    ['quantity must not be less than 1'],
    'Bad Request',
  )
  @ApiErrorResponse(
    HttpStatus.UNAUTHORIZED,
    'The signed-in user does not organize this event.',
    'You are not authorized to perfrom this action',
    'Unauthorized',
  )
  @ApiErrorResponse(
    HttpStatus.NOT_FOUND,
    'No event uses this id.',
    'Event not found',
    'Not Found',
  )
  @ApiErrorResponse(
    HttpStatus.CONFLICT,
    'This event already has a ticket type with the same name.',
    'This event already has a ticket type with that name',
    'Conflict',
  )
  create(
    @Body() dto: CreateTicketDto,
    @Param('eventId') eventId: string,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.ticketService.create(dto, eventId, organizerId);
  }
}
