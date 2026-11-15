import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderStatus } from '../generated/prisma/enums.js';

@Injectable()
export class OrdersExpirationService {
  private readonly logger = new Logger(OrdersExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  @Cron(CronExpression.EVERY_MINUTE)
  async expireOrders() {
    const now = new Date();
  
    // Find pending orders whose reservation has expired.
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: {
          lte: now,
        },
      },
      select: {
        id: true,
      },
    });
  
    for (const order of expiredOrders) {
      try {
        const expired = await this.prisma.$transaction(async (tx) => {
          // Claim the order for expiration.
          const result = await tx.order.updateMany({
            where: {
              id: order.id,
              status: OrderStatus.PENDING,
              expiresAt: {
                lte: now,
              },
            },
            data: {
              status: OrderStatus.EXPIRED,
            },
          });
  
          // Another process may already have handled this order.
          if (result.count === 0) {
            return false;
          }
  
          // Retrieve the items belonging to this order.
          const items = await tx.orderItem.findMany({
            where: {
              orderId: order.id,
            },
            select: {
              ticketTypeId: true,
              quantity: true,
            },
          });
  
          // Release the reserved inventory.
          for (const item of items) {
            const released = await tx.ticketType.updateMany({
              where: {
                id: item.ticketTypeId,
                reserved: {
                  gte: item.quantity,
                },
              },
              data: {
                reserved: {
                  decrement: item.quantity,
                },
              },
            });
  
            if (released.count !== 1) {
              throw new Error(
                `Could not release inventory for ticket type ${item.ticketTypeId}`,
              );
            }
          }
  
          return true;
        });
  
        if (expired) {
          this.logger.log(`Order ${order.id} expired successfully.`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to expire order ${order.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}