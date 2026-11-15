import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  EventStatus,
  TicketTypeStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import {
  paginate,
  paginationArgs,
} from '../common/utils/pagination.util.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';

@Injectable()
export class TicketsService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Everyone sees PUBLISHED ticket types; the organizer of the event also sees
   * that event's drafts, so they can manage them before publishing.
   */
  private visibility(
    eventId: string,
    userId?: string,
  ): Prisma.TicketTypeWhereInput {
    const published: Prisma.TicketTypeWhereInput = {
      eventId,
      status: TicketTypeStatus.PUBLISHED,
    };

    if (!userId) return published;

    return { eventId, OR: [published, { event: { organizerId: userId } }] };
  }

  async findAll(
    eventId: string,
    pagination: Partial<PaginationDto>,
    userId?: string,
  ) {
    const args = paginationArgs(pagination.page, pagination.limit);
    const where = this.visibility(eventId, userId);

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.ticketType.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: args.skip,
        take: args.take,
      }),
      this.prismaService.ticketType.count({ where }),
    ]);

    return paginate(data, total, args);
  }

  async findOne(ticketId: string, eventId: string, userId?: string) {
    const ticket = await this.prismaService.ticketType.findFirst({
      where: { id: ticketId, ...this.visibility(eventId, userId) },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async findOneById(id: string) {
    const ticket = await this.prismaService.ticketType.findFirst({
      where: {
        id,
        status: TicketTypeStatus.PUBLISHED,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async create(dto: CreateTicketDto, eventId: string, userId: string) {
    await this.findOwnedEvent(eventId, userId);

    const salesStart = this.toDate(dto.salesStart);
    const salesEnd = this.toDate(dto.salesEnd);
    this.assertSalesWindow(salesStart, salesEnd);

    try {
      return await this.prismaService.ticketType.create({
        data: {
          name: dto.name,
          price: dto.price,
          quantity: dto.quantity,
          eventId,
          sold: 0,
          status: TicketTypeStatus.DRAFT,
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(salesStart ? { salesStart } : {}),
          ...(salesEnd ? { salesEnd } : {}),
        },
      });
    } catch (error) {
      this.rethrowDuplicateName(error);
    }
  }

  async update(
    dto: UpdateTicketDto,
    ticketId: string,
    eventId: string,
    userId: string,
  ) {
    const ticket = await this.findOwnedTicket(ticketId, eventId, userId);

    if (ticket.status !== TicketTypeStatus.DRAFT) {
      throw new BadRequestException('Only draft ticket types can be updated');
    }

    if (dto.quantity !== undefined && dto.quantity < ticket.sold) {
      throw new BadRequestException(
        'Quantity cannot be less than the number already sold',
      );
    }

    const salesStart =
      dto.salesStart !== undefined
        ? this.toDate(dto.salesStart)
        : ticket.salesStart;
    const salesEnd =
      dto.salesEnd !== undefined ? this.toDate(dto.salesEnd) : ticket.salesEnd;
    this.assertSalesWindow(salesStart, salesEnd);

    try {
      const updated = await this.prismaService.ticketType.updateManyAndReturn({
        where: {
          id: ticketId,
          status: TicketTypeStatus.DRAFT,
          ...(dto.quantity !== undefined
            ? { sold: { lte: dto.quantity } }
            : {}),
        },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
          ...(dto.salesStart !== undefined ? { salesStart } : {}),
          ...(dto.salesEnd !== undefined ? { salesEnd } : {}),
        },
      });

      if (updated.length === 0) {
        await this.throwStaleUpdate(ticketId, eventId, userId);
      }

      return updated[0];
    } catch (error) {
      this.rethrowDuplicateName(error);
    }
  }

  async publish(ticketId: string, eventId: string, userId: string) {
    const ticket = await this.findOwnedTicket(ticketId, eventId, userId);

    if (ticket.status !== TicketTypeStatus.DRAFT) {
      throw new BadRequestException('Only draft ticket types can be published');
    }

    if (
      ticket.event.status === EventStatus.CANCELLED ||
      ticket.event.status === EventStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Tickets cannot be published for a cancelled or completed event',
      );
    }

    if (ticket.name.trim().length === 0) {
      throw new BadRequestException(
        'A ticket type needs a name before it can be published',
      );
    }

    if (!Number.isInteger(ticket.price) || ticket.price < 0) {
      throw new BadRequestException(
        'A ticket type needs a valid price before it can be published',
      );
    }

    if (!Number.isInteger(ticket.quantity) || ticket.quantity < 1) {
      throw new BadRequestException(
        'A ticket type needs a quantity of at least 1 before it can be published',
      );
    }

    if (ticket.quantity < ticket.sold) {
      throw new BadRequestException(
        'Quantity cannot be less than the number already sold',
      );
    }

    this.assertSalesWindow(ticket.salesStart, ticket.salesEnd);

    const updated = await this.prismaService.ticketType.updateManyAndReturn({
      where: {
        id: ticketId,
        status: TicketTypeStatus.DRAFT,
      },
      data: {
        status: TicketTypeStatus.PUBLISHED,
      },
    });

    if (updated.length === 0) {
      throw new BadRequestException('Only draft ticket types can be published');
    }

    return updated[0];
  }

  async delete(ticketId: string, eventId: string, userId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const ticket = await tx.ticketType.findFirst({
        where: {
          id: ticketId,
          eventId,
          event: { organizerId: userId },
        },
        select: { id: true },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      const deleted = await tx.ticketType.deleteMany({
        where: {
          id: ticketId,
          sold: 0,
        },
      });

      if (deleted.count === 0) {
        const current = await tx.ticketType.findUnique({
          where: { id: ticketId },
          select: { id: true },
        });
        if (!current) throw new NotFoundException('Ticket not found');
        throw new ConflictException(
          'This ticket type cannot be deleted because tickets have already been sold',
        );
      }

      return 'Ticket type successfully deleted';
    });
  }

  private async findOwnedEvent(eventId: string, userId: string) {
    const event = await this.prismaService.event.findFirst({
      where: {
        id: eventId,
        organizerId: userId,
      },
      select: { id: true },
    });

    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private async findOwnedTicket(
    ticketId: string,
    eventId: string,
    userId: string,
  ) {
    const ticket = await this.prismaService.ticketType.findFirst({
      where: {
        id: ticketId,
        eventId,
        event: { organizerId: userId },
      },
      include: {
        event: {
          select: { status: true },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  private async throwStaleUpdate(
    ticketId: string,
    eventId: string,
    userId: string,
  ): Promise<never> {
    const current = await this.findOwnedTicket(ticketId, eventId, userId);

    if (current.status !== TicketTypeStatus.DRAFT) {
      throw new BadRequestException('Only draft ticket types can be updated');
    }

    throw new BadRequestException(
      'Quantity cannot be less than the number already sold',
    );
  }

  private toDate(value?: string) {
    return value === undefined ? undefined : new Date(value);
  }

  private assertSalesWindow(
    salesStart?: Date | null,
    salesEnd?: Date | null,
  ) {
    if (salesStart && salesEnd && salesEnd <= salesStart) {
      throw new BadRequestException(
        'salesEnd must be later than salesStart',
      );
    }
  }

  private rethrowDuplicateName(error: unknown): never {
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
