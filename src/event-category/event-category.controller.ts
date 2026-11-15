import { Controller, Get } from '@nestjs/common';
import { EventCategory } from '../generated/prisma/enums.js';
import { ApiControllerTag } from '../common/decorators/api-controller-tag.decorator.js';
import { ApiGet } from '../common/decorators/api-operation.decorator.js';

@ApiControllerTag('Event categories')
@Controller('event-category')
export class EventCategoryController {
  @Get('categories')
  @ApiGet({
    summary: 'List event categories',
    description:
      'Returns the fixed category values an event can be filed under. This is not loaded from the database.',
    responseDescription: 'Category values.',
    example: Object.values(EventCategory),
  })
  getCategories() {
    return Object.values(EventCategory);
  }
}
