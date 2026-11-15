import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { TicketsService } from '../tickets.service.js';
import { AuthGuard, OptionalAuthGuard } from '../../auth/guards/auth.guards.js';
import { CreateTicketDto } from '../dto/create-ticket.dto.js';
import { UpdateTicketDto } from '../dto/update-ticket.dto.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import {
  publishedTicketExample,
  samples,
  ticketExample,
} from '../../common/swagger/samples.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { TicketResponse } from '../dto/ticket.response.js';
import { ApiControllerTag } from '../../common/decorators/api-controller-tag.decorator.js';
import {
  ApiCreate,
  ApiDelete,
  ApiGet,
  ApiOptionalAuth,
  ApiPaginatedList,
  ApiUpdate,
} from '../../common/decorators/api-operation.decorator.js';
import {
  ApiConflict,
  ApiNotFound,
  ApiValidationError,
} from '../../common/decorators/api-error.decorator.js';

@ApiControllerTag('Tickets')
@Controller('events/:eventId/tickets')
export class EventsTicketsController {
  constructor(private readonly ticketService: TicketsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOptionalAuth()
  @ApiPaginatedList({
    summary: 'List ticket types for an event',
    description:
      'Returns ticket types for the event whose status is PUBLISHED. The organizer of the event also sees that event drafts when they send a valid Bearer token. A Bearer token, when sent, must be valid. An unknown event id returns an empty page. Paginated with page and limit; order is createdAt descending, then id.',
    responseDescription: 'One page of ticket types for the event.',
    model: TicketResponse,
    example: [publishedTicketExample],
  })
  @ApiParam({
    name: 'eventId',
    format: 'uuid',
    example: samples.eventId,
  })
  @ApiValidationError('page or limit failed validation.', [
    'limit must not be greater than 100',
  ])
  findAll(
    @Param('eventId') eventId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.ticketService.findAll(eventId, pagination, userId);
  }

  @Get(':ticketId')
  @UseGuards(OptionalAuthGuard)
  @ApiOptionalAuth()
  @ApiGet({
    summary: 'Get a ticket type for an event',
    description:
      'Returns the ticket type when it belongs to the event and its status is PUBLISHED. The organizer of the event also gets drafts when they send a valid Bearer token.',
    responseDescription: 'The ticket type.',
    model: TicketResponse,
    example: publishedTicketExample,
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
  @ApiNotFound(
    'No ticket type with this id is visible to the caller on this event.',
    'Ticket not found',
  )
  findOne(
    @Param('eventId') eventId: string,
    @Param('ticketId') ticketId: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.ticketService.findOne(ticketId, eventId, userId);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiCreate({
    summary: 'Create a ticket type',
    description:
      'Creates a draft ticket type on an event organized by the signed-in user. sold starts at 0 and status is DRAFT. Those fields are not accepted in the body. currency defaults to NGN. The name must be unique on that event.',
    responseDescription: 'Draft ticket type created.',
    model: TicketResponse,
    example: ticketExample,
    protected: true,
  })
  @ApiParam({
    name: 'eventId',
    format: 'uuid',
    example: samples.eventId,
  })
  @ApiValidationError(
    'The body failed validation, or salesEnd is not later than salesStart.',
    ['quantity must not be less than 1'],
  )
  @ApiNotFound(
    'No event with this id belongs to the signed-in user.',
    'Event not found',
  )
  @ApiConflict(
    'This event already has a ticket type with the same name.',
    'This event already has a ticket type with that name',
  )
  create(
    @Body() dto: CreateTicketDto,
    @Param('eventId') eventId: string,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.ticketService.create(dto, eventId, organizerId);
  }

  @Patch(':ticketId')
  @UseGuards(AuthGuard)
  @ApiUpdate({
    summary: 'Update a draft ticket type',
    description:
      'Updates a draft ticket type on an event organized by the signed-in user. Omitted fields stay as they are. id, eventId, sold, and status cannot be changed here.',
    responseDescription: 'Draft ticket type updated.',
    model: TicketResponse,
    example: ticketExample,
    protected: true,
  })
  @ApiParam({
    name: 'eventId',
    format: 'uuid',
    example: samples.eventId,
  })
  @ApiParam({
    name: 'ticketId',
    format: 'uuid',
    example: ticketExample.id,
  })
  @ApiValidationError(
    'The body is invalid, the ticket is not a draft, the sales window is invalid, or quantity is below the number sold.',
    'Only draft ticket types can be updated',
  )
  @ApiNotFound(
    'No ticket type with this id belongs to an event organized by the signed-in user.',
    'Ticket not found',
  )
  @ApiConflict(
    'This event already has a ticket type with the same name.',
    'This event already has a ticket type with that name',
  )
  update(
    @Body() dto: UpdateTicketDto,
    @Param('eventId') eventId: string,
    @Param('ticketId') ticketId: string,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.ticketService.update(dto, ticketId, eventId, organizerId);
  }

  @Post(':ticketId/publish')
  @UseGuards(AuthGuard)
  @ApiCreate({
    summary: 'Publish a draft ticket type',
    description:
      'Sets status to PUBLISHED. The ticket must be a draft, have a name, a price of zero or more, a quantity of at least 1, and a valid sales window. The event must not be cancelled or completed.',
    responseDescription: 'Ticket type published.',
    model: TicketResponse,
    example: publishedTicketExample,
    protected: true,
  })
  @ApiParam({
    name: 'eventId',
    format: 'uuid',
    example: samples.eventId,
  })
  @ApiParam({
    name: 'ticketId',
    format: 'uuid',
    example: ticketExample.id,
  })
  @ApiValidationError(
    'The ticket is not a draft, its configuration is incomplete, or the event is cancelled or completed.',
    'Only draft ticket types can be published',
  )
  @ApiNotFound(
    'No ticket type with this id belongs to an event organized by the signed-in user.',
    'Ticket not found',
  )
  publish(
    @Param('eventId') eventId: string,
    @Param('ticketId') ticketId: string,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.ticketService.publish(ticketId, eventId, organizerId);
  }

  @Delete(':ticketId')
  @UseGuards(AuthGuard)
  @ApiDelete({
    summary: 'Delete a ticket type',
    description:
      'Deletes a ticket type on an event organized by the signed-in user. A ticket type with sales cannot be deleted.',
    responseDescription: 'Ticket type deleted.',
    example: 'Ticket type successfully deleted',
    protected: true,
  })
  @ApiParam({
    name: 'eventId',
    format: 'uuid',
    example: samples.eventId,
  })
  @ApiParam({
    name: 'ticketId',
    format: 'uuid',
    example: ticketExample.id,
  })
  @ApiNotFound(
    'No ticket type with this id belongs to an event organized by the signed-in user.',
    'Ticket not found',
  )
  @ApiConflict(
    'At least one ticket of this type has already been sold.',
    'This ticket type cannot be deleted because tickets have already been sold',
  )
  delete(
    @Param('eventId') eventId: string,
    @Param('ticketId') ticketId: string,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.ticketService.delete(ticketId, eventId, organizerId);
  }
}
