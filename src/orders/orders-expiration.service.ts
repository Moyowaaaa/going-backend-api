import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderStatus } from '../generated/prisma/enums.js';

@Injectable()
export class OrdersExpirationService {
  private readonly logger = new Logger(OrdersExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireOrders() {
    const now = new Date();

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: { lte: now },
      },
      select: { id: true },
    });

    for (const order of expiredOrders) {
      try {
        const expired = await this.prisma.$transaction(async (tx) => {
          const result = await tx.order.updateMany({
            where: {
              id: order.id,
              status: OrderStatus.PENDING,
              expiresAt: { lte: now },
            },
            data: { status: OrderStatus.EXPIRED },
          });

          if (result.count === 0) return false;

          const items = await tx.orderItem.findMany({
            where: { orderId: order.id },
            select: { ticketTypeId: true, quantity: true },
          });

          for (const item of items) {
            const released = await tx.$queryRaw<{ id: string }[]>`
              UPDATE "TicketType"
              SET "reserved" = "reserved" - ${item.quantity}
              WHERE "id" = ${item.ticketTypeId}
                AND "reserved" >= ${item.quantity}
              RETURNING "id"
            `;

            if (released.length === 0) {
              throw new Error(
                `Could not release inventory for ticket type ${item.ticketTypeId}`,
              );
            }
          }

          return true;
        });

        if (expired) this.logger.log(`Order ${order.id} expired successfully.`);
      } catch (error) {
        this.logger.error(
          `Failed to expire order ${order.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
