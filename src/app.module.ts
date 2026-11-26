import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { EventsModule } from './events/events.module.js';
import { EventCategoryModule } from './event-category/event-category.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { VenuesModule } from './venues/venues.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageModule } from './common/storage/storage.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { IssuedTicketsModule } from './issued-tickets/issued-tickets.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EventsModule,
    EventCategoryModule,
    TicketsModule,
    OrdersModule,
    PaymentsModule,
    IssuedTicketsModule,
    VenuesModule,
    StorageModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
