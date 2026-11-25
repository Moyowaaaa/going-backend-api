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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiParam } from '@nestjs/swagger';
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
  cancelledEventExample,
  completedEventExample,
  eventExample,
  eventWithCoverExample,
  eventWithImagesExample,
  galleryImageExample,
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
import {
  MAX_GALLERY_IMAGES,
  MAX_IMAGE_BYTES,
  type UploadedImage,
} from '../common/storage/image-storage.service.js';
import { EventImageResponse } from './dto/event-image.response.js';
import { ReorderImagesDto } from './dto/reorder-images.dto.js';

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
      'Moves a draft event to PUBLISHED. Only drafts can be published; a cancelled or completed event cannot. No body is read.',
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
  @ApiErrorExamples(
    HttpStatus.BAD_REQUEST,
    'The event is already published, cancelled or completed.',
    {
      notDraft: {
        summary: 'Already published',
        message: 'This event is already published',
        error: 'Bad Request',
      },
      cancelled: {
        summary: 'Event was cancelled',
        message: 'This event has been cancelled',
        error: 'Bad Request',
      },
    },
  )
  publish(@Param('id') id: string, @CurrentUser('id') organizerId: string) {
    return this.eventsService.publish(id, organizerId);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard)
  @ApiCreate({
    summary: 'Cancel an event',
    description:
      'Moves a draft or published event to CANCELLED and closes sales on all of its ticket types. Cancelled events disappear from the public list, cannot be published, edited, completed or bought for. No body is read.',
    responseDescription: 'Event cancelled.',
    model: EventResponse,
    example: cancelledEventExample,
    protected: true,
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
  @ApiErrorExamples(
    HttpStatus.BAD_REQUEST,
    'Only draft or published events can be cancelled.',
    {
      alreadyCancelled: {
        summary: 'Already cancelled',
        message: 'This event has been cancelled',
        error: 'Bad Request',
      },
      ended: {
        summary: 'Event already ended',
        message: 'This event has already ended',
        error: 'Bad Request',
      },
    },
  )
  cancel(@Param('id') id: string, @CurrentUser('id') organizerId: string) {
    return this.eventsService.cancel(id, organizerId);
  }

  @Post(':id/complete')
  @UseGuards(AuthGuard)
  @ApiCreate({
    summary: 'Complete an event',
    description:
      'Moves a published event to COMPLETED, closing it early. Events are also completed automatically within the hour after endDate passes. No body is read.',
    responseDescription: 'Event completed.',
    model: EventResponse,
    example: completedEventExample,
    protected: true,
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
  @ApiErrorExamples(
    HttpStatus.BAD_REQUEST,
    'The event is not published.',
    {
      notPublished: {
        summary: 'Event is a draft or was cancelled',
        message: 'Only published events can be completed',
        error: 'Bad Request',
      },
    },
  )
  complete(@Param('id') id: string, @CurrentUser('id') organizerId: string) {
    return this.eventsService.complete(id, organizerId);
  }

  @Post(':id/cover')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('cover', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: `The image file, sent as multipart/form-data in the "cover" field. JPEG, PNG or WebP, up to ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
    schema: {
      type: 'object',
      properties: {
        cover: { type: 'string', format: 'binary' },
      },
      required: ['cover'],
    },
  })
  @ApiCreate({
    summary: 'Upload an event cover image',
    description:
      'Replaces the cover image of an event owned by the signed-in user with the uploaded file. The previous file is deleted. Returns the event with its new CoverImage URL.',
    responseDescription: 'Cover image stored; event updated.',
    model: EventResponse,
    example: eventWithCoverExample,
    protected: true,
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
  @ApiErrorExamples(
    HttpStatus.BAD_REQUEST,
    'The file is missing, too large, or not a JPEG, PNG or WebP image.',
    {
      missing: {
        summary: 'No file sent',
        message: 'Attach the image as the "cover" form field',
        error: 'Bad Request',
      },
      wrongType: {
        summary: 'Unsupported file type',
        message: 'Cover image must be a JPEG, PNG or WebP file',
        error: 'Bad Request',
      },
      cancelled: {
        summary: 'Event was cancelled',
        message: 'This event has been cancelled',
        error: 'Bad Request',
      },
    },
  )
  uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImage | undefined,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.eventsService.uploadCover(id, organizerId, file);
  }

  @Delete(':id/cover')
  @UseGuards(AuthGuard)
  @ApiDelete({
    summary: 'Remove an event cover image',
    description:
      'Clears CoverImage on an event owned by the signed-in user and deletes the stored file.',
    responseDescription: 'Cover image removed; event updated.',
    model: EventResponse,
    example: { ...eventExample, CoverImage: null },
    protected: true,
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
  removeCover(@Param('id') id: string, @CurrentUser('id') organizerId: string) {
    return this.eventsService.removeCover(id, organizerId);
  }

  @Post(':id/images')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', MAX_GALLERY_IMAGES, {
      limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_GALLERY_IMAGES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: `One or more images sent as multipart/form-data in the "images" field. JPEG, PNG or WebP, up to ${MAX_IMAGE_BYTES / (1024 * 1024)} MB each, at most ${MAX_GALLERY_IMAGES} images per event.`,
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['images'],
    },
  })
  @ApiCreate({
    summary: 'Upload event gallery images',
    description:
      'Appends images to the gallery of an event owned by the signed-in user and returns the full gallery in display order. The cover image is separate; use POST /events/:id/cover for it.',
    responseDescription: 'Gallery images stored.',
    model: EventImageResponse,
    isArray: true,
    example: eventWithImagesExample.images,
    protected: true,
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
  @ApiErrorExamples(
    HttpStatus.BAD_REQUEST,
    'No file was sent, a file is not an image, or the gallery would exceed its limit.',
    {
      missing: {
        summary: 'No file sent',
        message: 'Attach the images as the "images" form field',
        error: 'Bad Request',
      },
      wrongType: {
        summary: 'Unsupported file type',
        message: 'Gallery images must be JPEG, PNG or WebP files',
        error: 'Bad Request',
      },
      tooMany: {
        summary: 'Gallery is full',
        message: `An event can have at most ${MAX_GALLERY_IMAGES} gallery images`,
        error: 'Bad Request',
      },
    },
  )
  addImages(
    @Param('id') id: string,
    @UploadedFiles() files: UploadedImage[] | undefined,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.eventsService.addImages(id, organizerId, files);
  }

  @Put(':id/images/order')
  @UseGuards(AuthGuard)
  @ApiUpdate({
    summary: 'Reorder event gallery images',
    description:
      'Sets the display order of the gallery. Send every image id of the event exactly once, in the order they should appear.',
    responseDescription: 'Gallery in its new order.',
    model: EventImageResponse,
    isArray: true,
    example: eventWithImagesExample.images,
    protected: true,
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: eventExample.id,
  })
  @ApiValidationError('The body failed validation.', [
    'imageIds must be an array',
  ])
  @ApiNotFound(
    'No event with this id belongs to the signed-in user.',
    'Event not found',
  )
  @ApiErrorExamples(
    HttpStatus.BAD_REQUEST,
    'The ids do not exactly match the gallery of this event, or the event cannot be changed.',
    {
      mismatch: {
        summary: 'Incomplete or unknown ids',
        message: 'Send every image id of this event exactly once',
        error: 'Bad Request',
      },
      cancelled: {
        summary: 'Event was cancelled',
        message: 'This event has been cancelled',
        error: 'Bad Request',
      },
    },
  )
  reorderImages(
    @Param('id') id: string,
    @Body() dto: ReorderImagesDto,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.eventsService.reorderImages(id, organizerId, dto.imageIds);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(AuthGuard)
  @ApiDelete({
    summary: 'Delete an event gallery image',
    description:
      'Removes one gallery image from an event owned by the signed-in user and deletes the stored file.',
    responseDescription: 'Image deleted.',
    example: 'Image successfully deleted',
    protected: true,
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: eventExample.id,
  })
  @ApiParam({
    name: 'imageId',
    format: 'uuid',
    example: galleryImageExample.id,
  })
  @ApiNotFound(
    'No event with this id belongs to the signed-in user, or the image is not in this event.',
    'Image not found',
  )
  removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.eventsService.removeImage(id, imageId, organizerId);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiUpdate({
    summary: 'Update an event',
    description:
      'Updates a draft or published event owned by the signed-in user. Fields you omit are cleared, because the update writes each body field as given. Categories, status, and slug are left unchanged. Cancelled and completed events cannot be updated.',
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
    description:
      'Deletes an event owned by the signed-in user. Refused once tickets have been sold or an order references the event.',
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
