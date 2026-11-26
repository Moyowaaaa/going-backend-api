import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventStatus } from '../generated/prisma/enums.js';

/** Moves events whose end time has passed from PUBLISHED to COMPLETED. */
@Injectable()
export class EventsLifecycleService {
  private readonly logger = new Logger(EventsLifecycleService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async completeEndedEvents() {
    const completed = await this.prisma.event.updateMany({
      where: {
        status: EventStatus.PUBLISHED,
        endDate: { lt: new Date() },
      },
      data: { status: EventStatus.COMPLETED },
    });

    if (completed.count > 0) {
      this.logger.log(`Marked ${completed.count} ended event(s) as completed`);
    }
  }
}
