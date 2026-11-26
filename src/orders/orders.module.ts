import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { OrdersExpirationService } from './orders-expiration.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService,OrdersExpirationService]
})
export class OrdersModule {}
