import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service.js';
import { AuthGuard } from '../auth/guards/auth.guards.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDTO } from './dto/update-event.dto.js';
import { EventCategory } from '../generated/prisma/enums.js';
import {
  ApiErrorExamples,
  ApiErrorResponse,
  ApiProtected,
} from '../common/swagger/api-error.js';
import { ApiWrappedResponse } from '../common/swagger/api-wrapped-response.js';
import {
  eventExample,
  publishedEventExample,
  updatedEventExample,
} from '../common/swagger/samples.js';
import { EventResponse } from './dto/event.response.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({
    summary: 'List events',
    description:
      'Returns every event, including drafts. Pass q to match the title (case-insensitive). Pass category to filter by category instead; when category is present, q is ignored. Results are not paginated.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Case-insensitive substring matched against the event title.',
    example: 'jazz',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description:
      'Category filter. Replaces the title search when it is present.',
    enum: Object.values(EventCategory),
    example: EventCategory.MUSIC,
  })
  @ApiWrappedResponse({
    status: HttpStatus.OK,
    description: 'Matching events.',
    model: EventResponse,
    isArray: true,
    example: [eventExample],
  })
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    'category is not one of the known event categories.',
    'Unknown event category',
    'Bad Request',
  )
  findAll(@Query('q') q?: string, @Query('category') category?: string) {
    if (category) return this.eventsService.findAllInCategory({ category });
    return this.eventsService.findAll(q);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get an event by slug' })
  @ApiParam({
    name: 'slug',
    description: 'Unique event slug.',
    example: eventExample.slug,
  })
  @ApiWrappedResponse({
    status: HttpStatus.OK,
    description: 'The event.',
    model: EventResponse,
    example: eventExample,
  })
  @ApiErrorResponse(
    HttpStatus.NOT_FOUND,
    'No event uses this slug.',
    `No event with slug: ${eventExample.slug} found`,
    'Not Found',
  )
  findOneSlug(@Param('slug') slug: string) {
    return this.eventsService.findOneSlug(slug);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiProtected()
  @ApiOperation({
    summary: 'Create an event',
    description:
      'Creates a draft event owned by the signed-in user. The slug is generated from the title and start date. locationType defaults to PHYSICAL. coverImage is stored as CoverImage. timezone is validated and not stored. venueId and accentColor are accepted and not applied on create.',
  })
  @ApiWrappedResponse({
    status: HttpStatus.CREATED,
    description: 'Draft event created.',
    model: EventResponse,
    example: eventExample,
  })
  @ApiErrorExamples(HttpStatus.BAD_REQUEST, 'The body failed validation.', {
    validation: {
      summary: 'Invalid body',
      message: ['title must be longer than or equal to 3 characters'],
      error: 'Bad Request',
    },
    otherCombined: {
      summary: 'OTHER combined with another category',
      message: '"OTHER" cannot be combined with other categories',
      error: 'Bad Request',
    },
  })
  create(@Body() dto: CreateEventDto, @CurrentUser('id') organizerId: string) {
    return this.eventsService.create(dto, organizerId);
  }

  @Post(':id')
  @UseGuards(AuthGuard)
  @ApiProtected()
  @ApiOperation({
    summary: 'Publish an event',
    description:
      'Sets status to PUBLISHED when the event belongs to the signed-in user. A body is accepted and ignored.',
  })
  @ApiParam({
    name: 'id',
    description: 'Event id.',
    format: 'uuid',
    example: eventExample.id,
  })
  @ApiWrappedResponse({
    status: HttpStatus.CREATED,
    description: 'Event published.',
    model: EventResponse,
    example: publishedEventExample,
  })
  @ApiErrorResponse(
    HttpStatus.NOT_FOUND,
    'No event with this id belongs to the signed-in user.',
    'Event not found',
    'Not Found',
  )
  publish(
    @Param('id') id: string,
    @Body() dto: UpdateEventDTO,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.eventsService.publish(id, organizerId);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiProtected()
  @ApiOperation({
    summary: 'Update an event',
    description:
      'Updates an event owned by the signed-in user. Fields you omit are cleared, because the update writes each body field as given. Categories, status, and slug are left unchanged.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: eventExample.id,
  })
  @ApiWrappedResponse({
    status: HttpStatus.OK,
    description: 'Event updated.',
    model: EventResponse,
    example: updatedEventExample,
  })
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    'The body failed validation.',
    ['coverImage must be a URL address'],
    'Bad Request',
  )
  @ApiErrorResponse(
    HttpStatus.NOT_FOUND,
    'No event with this id belongs to the signed-in user.',
    'Event not found',
    'Not Found',
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDTO,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.eventsService.update(id, organizerId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiProtected()
  @ApiOperation({
    summary: 'Delete an event',
    description: 'Deletes an event owned by the signed-in user.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: eventExample.id,
  })
  @ApiWrappedResponse({
    status: HttpStatus.OK,
    description: 'Event deleted.',
    example: 'Event successfully deleted',
  })
  @ApiErrorResponse(
    HttpStatus.NOT_FOUND,
    'No event with this id belongs to the signed-in user.',
    'Event not found',
    'Not Found',
  )
  delete(@Param('id') id: string, @CurrentUser('id') organizerId: string) {
    return this.eventsService.delete(organizerId, id);
  }
}
