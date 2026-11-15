import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';

@Injectable()
export class TicketsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllTickets(){
    const tickets = await this.prismaService.ticketType.findMany();
  
      return tickets;
  }


  //Get all event's tickets
  async findAll(eventId: string) {
    const tickets = await this.prismaService.ticketType.findMany({
      where: {
        eventId,
        status: 'PUBLISHED',
      },
    });

    return tickets;
  }

  //Get event ticket by eventId
  async findOne(ticketId: string, eventId: string) {
    const ticket = await this.prismaService.ticketType.findFirst({
      where: {
        id: ticketId,
        eventId,
        status: 'PUBLISHED',
      },
    });
    if (!ticket)
      throw new NotFoundException(`No event with slug: ${ticketId} found`);
    return ticket;
  }

  //Get ticket by ticketId
  async findOneById(id: string) {
    const ticket = await this.prismaService.ticketType.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
      },
    });
    if (!ticket) throw new NotFoundException(`No event with slug: ${id} found`);
    return ticket;
  }

  // Create event ticket
  async create(dto: CreateTicketDto, eventId: string, userId: string) {
    const event = await this.prismaService.event.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (userId !== event.organizerId) {
      throw new UnauthorizedException(
        'You are not authorized to perfrom this action',
      );
    }

    try {
      return await this.prismaService.ticketType.create({
        data: {
          ...dto,
          eventId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This event already has a ticket type with that name',
        );
      }
      throw error;
    }
  }

  //Update event ticket
  async update(dto: UpdateTicketDto, ticketId: string, eventId: string) {
    const ticket = await this.prismaService.ticketType.findFirst({
      where: {
        id: ticketId,
        eventId,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prismaService.ticketType.update({
      where: {
        id: ticketId,
      },
      data: {
        ...dto,
      },
    });
  }
}
