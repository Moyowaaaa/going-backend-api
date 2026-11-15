import { Module } from '@nestjs/common';
import { EventCategoryController } from './event-category.controller.js';

@Module({
  controllers: [EventCategoryController]
})
export class EventCategoryModule {}
