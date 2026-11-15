import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TicketsService } from '../tickets.service.js';
import { AuthGuard } from '../../auth/guards/auth.guards.js';
import { CreateTicketDto } from '../dto/create-ticket.dto.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/decorators/current-user.decorator.js';

@Controller('events/:eventId/tickets')
export class EventsTicketsController {
  constructor(private readonly ticketService: TicketsService) {}
  //GET event tickets '/{eventId}/tickets'
  @Get()
  findAll(@Param('eventId') eventId: string) {
    return this.ticketService.findAll(eventId);
  }

  //GET event ticket '/{eventId}/tickets/${ticketId}
  @Get(':ticketId')
  findOne(
    @Param('eventId') eventId: string,
    @Param('ticketId') ticketId: string,
  ) {
    return this.ticketService.findOne(ticketId, eventId);
  }

  //Create event ticket 'events/${eventId}/tickets'
  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() dto: CreateTicketDto,
    @Param('eventId') eventId: string,
    @CurrentUser('id') organizerId: string
  ) {
    return this.ticketService.create(dto, eventId,  organizerId);
  }
}
