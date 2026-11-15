import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderStatus, Prisma } from '../generated/prisma/client.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
import { paginate, paginationArgs } from '../common/utils/pagination.util.js';

@Injectable()
export class OrdersService {
    constructor(private readonly prisma:PrismaService){}


async create(userId: string, dto: CreateOrderDto) {
    const ticketTypeIds = dto.items.map((item) => item.ticketTypeId);
  
    return this.prisma.$transaction(
      async (tx) => {
        const ticketTypes = await tx.ticketType.findMany({
          where: {
            id: { in: ticketTypeIds },
          },
          include: {
            event: true,
          },
        });
  
        if (ticketTypes.length !== dto.items.length) {
          throw new NotFoundException(
            'One or more ticket types could not be found.',
          );
        }
  
        const now = new Date();
  
        for (const item of dto.items) {
          const ticketType = ticketTypes.find(
            (ticket) => ticket.id === item.ticketTypeId,
          );
  
          if (!ticketType) {
            throw new NotFoundException('Ticket type not found.');
          }
  
          if (ticketType.status !== 'PUBLISHED') {
            throw new BadRequestException(
              `${ticketType.name} is not available for purchase.`,
            );
          }
  
          if (ticketType.event.status !== 'PUBLISHED') {
            throw new BadRequestException(
              'Tickets for this event are not available.',
            );
          }
  
          if (ticketType.event.endDate <= now) {
            throw new BadRequestException(
              'This event has already ended.',
            );
          }
  
          if (ticketType.salesStart && ticketType.salesStart > now) {
            throw new BadRequestException(
              `${ticketType.name} sales have not started.`,
            );
          }
  
          if (ticketType.salesEnd && ticketType.salesEnd <= now) {
            throw new BadRequestException(
              `${ticketType.name} sales have ended.`,
            );
          }
        }
  
        const currencies = new Set(
          ticketTypes.map((ticket) => ticket.currency),
        );
  
        if (currencies.size !== 1) {
          throw new BadRequestException(
            'All tickets in an order must use the same currency.',
          );
        }
  
        for (const item of dto.items) {
          const reservation = await tx.ticketType.updateMany({
            where: {
              id: item.ticketTypeId,
              status: 'PUBLISHED',
              quantity: {
                gte: item.quantity,
              },
            },
            data: {
              reserved: {
                increment: item.quantity,
              },
            },
          });
  
          if (reservation.count === 0) {
            throw new ConflictException(
              'One or more ticket types no longer have sufficient availability.',
            );
          }
        }
  
        let total = 0;
  
        const orderItems = dto.items.map((item) => {
          const ticketType = ticketTypes.find(
            (ticket) => ticket.id === item.ticketTypeId,
          )!;
  
          const subtotal = ticketType.price * item.quantity;
  
          total += subtotal;
  
          return {
            ticketTypeId: ticketType.id,
            quantity: item.quantity,
            unitPrice: ticketType.price,
            subtotal,
          };
        });
  
        const order = await tx.order.create({
          data: {
            reference: crypto.randomUUID(),
            userId,
            total,
            currency: ticketTypes[0].currency,
            expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
            items: {
              create: orderItems,
            },
          },
          include: {
            items: true,
          },
        });
  
        return order;
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }
  private async listOrders(
    where: Prisma.OrderWhereInput,
    pagination: Partial<PaginationDto>,
  ) {
    const args = paginationArgs(pagination.page, pagination.limit);
  
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: args.skip,
        take: args.take,
      }),
      this.prisma.order.count({ where }),
    ]);
  
    return paginate(data, total, args);
  }


  async findAll(userId: string, dto: ListOrdersDto) {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(dto.q
        ? {
            reference: {
              contains: dto.q,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(dto.status ? { status: dto.status } : {}),
    };

    return this.listOrders(where, dto);
  }


    async findOne(orderId: string, userId: string) {
        const order = await this.prisma.order.findFirst({
          where: {
            id: orderId,
            userId,
          },
          include: {
            items: {
              include: {
                ticketType: {
                  include: {
                    event: true,
                  },
                },
              },
            },
            payments: true,
          },
        });
      
        if (!order) {
          throw new NotFoundException('Order not found.');
        }
      
        return order;
      }
  
}
