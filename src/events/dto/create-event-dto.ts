
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsDateString,
    IsUrl,
    IsUUID,
    MaxLength,
    MinLength,
  } from 'class-validator';
  
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
  }
  