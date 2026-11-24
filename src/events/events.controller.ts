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
import { ApiParam } from '@nestjs/swagger';
import { EventsService } from './events.service.js';
import { AuthGuard, OptionalAuthGuard } from '../auth/guards/auth.guards.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDTO } from './dto/update-event.dto.js';
import { ListEventsDto } from './dto/list-events.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import {
  ApiErrorExamples,
  ApiErrorResponse,
} from '../common/swagger/api-error.js';
import {
  eventExample,
  publishedEventExample,
  updatedEventExample,
} from '../common/swagger/samples.js';
import { EventResponse } from './dto/event.response.js';
import { ApiControllerTag } from '../common/decorators/api-controller-tag.decorator.js';
import {
  ApiCreate,
  ApiDelete,
  ApiGet,
  ApiOptionalAuth,
  ApiPaginatedList,
  ApiUpdate,
} from '../common/decorators/api-operation.decorator.js';
import {
  ApiNotFound,
  ApiValidationError,
} from '../common/decorators/api-error.decorator.js';

@ApiControllerTag('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOptionalAuth()
  @ApiPaginatedList({
    summary: 'List events',
    description:
      'Returns published, cancelled and completed events, newest first. An anonymous caller never sees drafts; a signed-in caller also sees the drafts they organize. A Bearer token, when sent, must be valid. Pass q to match the title (case-insensitive). Pass category to filter by category instead; when category is present, q is ignored. Paginated with page and limit; order is createdAt descending, then id.',
    responseDescription: 'One page of matching events.',
    model: EventResponse,
    example: [eventExample],
  })
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    'category is not one of the known event categories, or page/limit failed validation.',
    'Unknown event category',
    'Bad Request',
  )
  findAll(@Query() query: ListEventsDto, @CurrentUser('id') userId?: string) {
    if (query.category) {
      return this.eventsService.findAllInCategory(query, userId);
    }
    return this.eventsService.findAll(query, userId);
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  @ApiPaginatedList({
    summary: 'List the signed-in organizer events',
    description:
      'Returns every event owned by the signed-in user, drafts included, newest first. Paginated with page and limit; order is createdAt descending, then id.',
    responseDescription: 'One page of the organizer events.',
    model: EventResponse,
    example: [eventExample],
    protected: true,
  })
  findMine(
    @CurrentUser('id') organizerId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.eventsService.findMine(organizerId, pagination);
  }

  @Get(':slug')
  @ApiGet({
    summary: 'Get an event by slug',
    responseDescription: 'The event.',
    model: EventResponse,
    example: eventExample,
  })
  @ApiParam({
    name: 'slug',
    description: 'Unique event slug.',
    example: eventExample.slug,
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
  @ApiCreate({
    summary: 'Create an event',
    description:
      'Creates a draft event owned by the signed-in user. The slug is generated from the title and start date. locationType defaults to PHYSICAL. coverImage is stored as CoverImage. timezone is validated and not stored. Send venueId to link an existing venue, or venueInput.venue with the place details picked on the client (e.g. from a Google Maps search) to create the venue with the event; sending both answers 400. accentColor is accepted and not applied on create.',
    responseDescription: 'Draft event created.',
    model: EventResponse,
    example: eventExample,
    protected: true,
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

  @Post(':id/publish')
  @UseGuards(AuthGuard)
  @ApiCreate({
    summary: 'Publish an event',
    description:
      'Sets status to PUBLISHED when the event belongs to the signed-in user. No body is read.',
    responseDescription: 'Event published.',
    model: EventResponse,
    example: publishedEventExample,
    protected: true,
  })
  @ApiParam({
    name: 'id',
    description: 'Event id.',
    format: 'uuid',
    example: eventExample.id,
  })
  @ApiNotFound(
    'No event with this id belongs to the signed-in user.',
    'Event not found',
  )
  publish(@Param('id') id: string, @CurrentUser('id') organizerId: string) {
    return this.eventsService.publish(id, organizerId);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiUpdate({
    summary: 'Update an event',
    description:
      'Updates an event owned by the signed-in user. Fields you omit are cleared, because the update writes each body field as given. Categories, status, and slug are left unchanged.',
    responseDescription: 'Event updated.',
    model: EventResponse,
    example: updatedEventExample,
    protected: true,
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: eventExample.id,
  })
  @ApiValidationError('The body failed validation.', [
    'coverImage must be a URL address',
  ])
  @ApiNotFound(
    'No event with this id belongs to the signed-in user.',
    'Event not found',
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
  @ApiDelete({
    summary: 'Delete an event',
    responseDescription: 'Event deleted.',
    example: 'Event successfully deleted',
    protected: true,
    description: 'Deletes an event owned by the signed-in user.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: eventExample.id,
  })
  @ApiNotFound(
    'No event with this id belongs to the signed-in user.',
    'Event not found',
  )
  delete(@Param('id') id: string, @CurrentUser('id') organizerId: string) {
    return this.eventsService.delete(organizerId, id);
  }
}
