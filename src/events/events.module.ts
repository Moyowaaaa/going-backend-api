import { Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { EventsLifecycleService } from './events-lifecycle.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StorageModule } from '../common/storage/storage.module.js';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [EventsController],
  providers: [EventsService, EventsLifecycleService],
})
export class EventsModule {}
