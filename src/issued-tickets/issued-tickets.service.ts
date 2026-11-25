import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class IssuedTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every issued ticket belonging to the signed-in buyer. */
  async findMine(userId: string) {
    return this.prisma.ticket.findMany({
      where: { orderItem: { order: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItem: {
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
                event: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    venue: { select: { name: true, address: true } },
                  },
                },
              },
            },
            order: {
              select: { id: true, reference: true, status: true, currency: true },
            },
          },
        },
      },
    });
  }

  /** Organizer-only check-in. Repeated scans are rejected, not double-counted. */
  async checkIn(organizerId: string, qrToken: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { qrToken },
      include: {
        orderItem: {
          include: {
            ticketType: {
              include: { event: { select: { id: true, organizerId: true, status: true } } },
            },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found.');

    if (ticket.orderItem.ticketType.event.organizerId !== organizerId) {
      throw new ForbiddenException('You do not manage this event.');
    }

    if (ticket.orderItem.ticketType.event.status === 'CANCELLED') {
      throw new BadRequestException('This event has been cancelled.');
    }

    if (ticket.status !== 'VALID') {
      throw new ConflictException(`Ticket is already ${ticket.status.toLowerCase()}.`);
    }

    const claimed = await this.prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'VALID' },
      data: { status: 'USED', usedAt: new Date() },
    });

    if (claimed.count === 0) {
      throw new ConflictException('Ticket is already used.');
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      status: 'USED',
      checkedInAt: new Date().toISOString(),
    };
  }
}
