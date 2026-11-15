import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';
import { EventsTicketsController } from './events-tickets/events-tickets.controller.js';

@Module({
  controllers: [TicketsController, EventsTicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
