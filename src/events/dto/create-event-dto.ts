
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
  } from 'class-validator';
import { EventCategory } from '../../generated/prisma/enums.js';

  export const MAX_EVENT_CATEGORIES = 5;

  export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(100)
    title: string;
  
    @IsString()
    @IsNotEmpty()
    @MinLength(20)
    @MaxLength(5000)
    description: string;
  
    @IsDateString()
    startDate: string;
  
    @IsDateString()
    endDate: string;
  
    @IsOptional()
    @IsString()
    timezone?: string;
  
    @IsOptional()
    @IsUrl()
    coverImage?: string;
  
    @IsOptional()
    @IsUUID()
    venueId?: string;
    

    @IsOptional()
    accentColor?: string

    /**
     * Optional. Omit it (or send an empty array) and the event is filed
     * under OTHER. "OTHER" can't be combined with any other category.
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
  