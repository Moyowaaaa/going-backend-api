import { ApiProperty } from '@nestjs/swagger';
import {
  EventCategory,
  EventStatus,
  EventType,
} from '../../generated/prisma/enums.js';
import { eventExample } from '../../common/swagger/samples.js';
import { EventImageResponse } from './event-image.response.js';

export class EventResponse {
  @ApiProperty({ format: 'uuid', example: eventExample.id })
  id: string;

  @ApiProperty({ example: eventExample.slug })
  slug: string;

  @ApiProperty({ example: eventExample.title })
  title: string;

  @ApiProperty({
    nullable: true,
    example: eventExample.description,
  })
  description: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Hex or CSS color stored for the event. Null until set.',
    example: eventExample.accentColor,
  })
  accentColor: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Cover image URL. The JSON field name is CoverImage.',
    example: eventExample.CoverImage,
  })
  CoverImage: string | null;

  @ApiProperty({ format: 'date-time', example: eventExample.startDate })
  startDate: string;

  @ApiProperty({ format: 'date-time', example: eventExample.endDate })
  endDate: string;

  @ApiProperty({
    enum: Object.values(EventStatus),
    enumName: 'EventStatus',
    example: eventExample.status,
  })
  status: string;

  @ApiProperty({ format: 'uuid', example: eventExample.organizerId })
  organizerId: string;

  @ApiProperty({
    enum: Object.values(EventType),
    enumName: 'EventType',
    example: eventExample.locationType,
  })
  locationType: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    example: eventExample.venueId,
  })
  venueId: string | null;

  @ApiProperty({
    enum: Object.values(EventCategory),
    enumName: 'EventCategory',
    isArray: true,
    example: eventExample.categories,
  })
  categories: string[];

  @ApiProperty({
    type: EventImageResponse,
    isArray: true,
    description:
      'Gallery images in display order. Empty until images are uploaded; the cover image is separate and lives in CoverImage.',
    example: eventExample.images,
  })
  images: EventImageResponse[];

  @ApiProperty({ format: 'date-time', example: eventExample.createdAt })
  createdAt: string;

  @ApiProperty({ format: 'date-time', example: eventExample.updatedAt })
  updatedAt: string;
}
