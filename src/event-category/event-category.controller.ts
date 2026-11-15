import { Controller, Get } from '@nestjs/common';
import { EventCategory } from '../generated/prisma/enums.js';

@Controller('event-category')
export class EventCategoryController {
  @Get('categories')
  getCategories() {
    return Object.values(EventCategory);
  }
}
