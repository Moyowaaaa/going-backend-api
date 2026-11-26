import { Type } from 'class-transformer';
import {
IsInt,
IsNotEmpty,
IsNumber,
IsOptional,
IsString,
Max,
MaxLength,
Min,
MinLength,
ValidateNested,
} from 'class-validator';

/**
* Venue details picked on the client (e.g. from a Google Maps place search)
* and sent with the event payload. The server stores them as a Venue row
* linked to the event; the client never calls the venues endpoints for this.
*/
export class VenueInputDto {
/**
* Venue name, as shown in the place search.
* @example "Freedom Park"
*/
@IsString()
@IsNotEmpty()
@MinLength(3)
@MaxLength(100)
name: string;

/**
* Street address from the place.
* @example "1 Independence Way, Victoria Island"
*/
@IsString()
@IsNotEmpty()
@MaxLength(500)
address: string;

/**
* City from the place.
* @example "Lagos"
*/
@IsString()
@IsNotEmpty()
@MaxLength(100)
city: string;

/**
* State or region, when the place has one.
* @example "Lagos State"
*/
@IsOptional()
@IsString()
@MaxLength(100)
state?: string;

/**
* Country from the place.
* @example "Nigeria"
*/
@IsString()
@IsNotEmpty()
@MaxLength(100)
country: string;

/**
* Maximum number of people the venue can hold, when known.
* @example 5000
*/
@IsOptional()
@IsInt()
@Min(1)
capacity?: number;

/**
* Latitude in decimal degrees, between -90 and 90.
* @example 6.4281
*/
@IsOptional()
@IsNumber()
@Min(-90)
@Max(90)
latitude?: number;

/**
* Longitude in decimal degrees, between -180 and 180.
* @example 3.4219
*/
@IsOptional()
@IsNumber()
@Min(-180)
@Max(180)
longitude?: number;
}

/**
* The `venue` field on an event payload: either a nested venue to create
* with the event, or an existing venue id to link. Exactly one of the two.
*/
export class EventVenueDto {
/**
* Existing venue id to link to this event.
* @example b7e1d4c2-9a30-4c55-8e11-0f2a6b8c9d10
*/
@IsOptional()
@IsString()
venueId?: string;

/**
* New venue details to create and link to this event.
*/
@IsOptional()
@ValidateNested()
@Type(() => VenueInputDto)
venue?: VenueInputDto;
}
