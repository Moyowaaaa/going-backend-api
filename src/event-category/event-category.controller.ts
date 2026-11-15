import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventCategory } from '../generated/prisma/enums.js';
import { ApiWrappedResponse } from '../common/swagger/api-wrapped-response.js';

@ApiTags('Event categories')
@Controller('event-category')
export class EventCategoryController {
  @Get('categories')
  @ApiOperation({
    summary: 'List event categories',
    description:
      'Returns the fixed category values an event can be filed under. This is not loaded from the database.',
  })
  @ApiWrappedResponse({
    status: HttpStatus.OK,
    description: 'Category values.',
    example: Object.values(EventCategory),
  })
  getCategories() {
    return Object.values(EventCategory);
  }
}
