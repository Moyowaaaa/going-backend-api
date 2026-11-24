import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EventCategory } from '../../generated/prisma/enums.js';
import { EventVenueDto } from '../../venues/dto/venue-input.dto.js';

export const MAX_EVENT_CATEGORIES = 5;

export class CreateEventDto {
  /**
   * Public title. A slug is generated from this and the start date.
   * @example "Lagos Jazz Night"
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  /**
   * Event description shown on the event page.
   * @example "An evening of live jazz on the Victoria Island waterfront."
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(5000)
  description: string;

  /**
   * When the event starts, as an ISO-8601 date-time.
   * @example 2026-11-20T18:00:00.000Z
   */
  @IsDateString()
  startDate: string;

  /**
   * When the event ends, as an ISO-8601 date-time.
   * @example 2026-11-20T23:00:00.000Z
   */
  @IsDateString()
  endDate: string;

  /**
   * IANA timezone name. Accepted on the request and not stored on the event.
   * @example Africa/Lagos
   */
  @IsOptional()
  @IsString()
  timezone?: string;

  /**
   * Absolute URL of the cover image.
   * @example https://cdn.going.example/events/lagos-jazz-night.jpg
   */
  @IsOptional()
  @IsUrl()
  coverImage?: string;

  /**
   * Venue id. Accepted on create and applied when updating an event.
   * @example b7e1d4c2-9a30-4c55-8e11-0f2a6b8c9d10
   */
  @IsOptional()
  @IsUUID()
  venueId?: string;

  /**
   * Venue picked on the client (e.g. from a Google Maps place search).
   * Send either `venueId` (link an existing venue) or `venue` (create the
   * venue with this event), not both.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => EventVenueDto)
  venueInput?: EventVenueDto;

  /**
   * Accent color stored with the event. Applied on update.
   * @example #1B4D3E
   */
  @IsOptional()
  accentColor?: string;

  /**
   * Optional. Omit it (or send an empty array) and the event is filed
   * under OTHER. "OTHER" can't be combined with any other category.
   * @example ["MUSIC"]
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EVENT_CATEGORIES)
  @IsEnum(EventCategory, {
    each: true,
    message: `each category must be one of: ${Object.values(EventCategory).join(', ')}`,
  })
  categories?: EventCategory[];
}
