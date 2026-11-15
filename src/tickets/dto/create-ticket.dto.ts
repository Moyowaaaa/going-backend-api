import {
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Length,
    MaxLength,
    Min,
  } from 'class-validator';
import { TicketStatus } from '../../generated/prisma/enums.js';
  
  export class CreateTicketDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
  
    @IsInt()
    @Min(0)
    price: number;
  
    @IsOptional()
    @IsString()
    @Length(3, 3)
    currency?: string;
  
    @IsInt()
    @Min(1)
    quantity: number;
  
    @IsOptional()
    @IsDateString()
    salesStart?: string;
  
    @IsOptional()
    @IsDateString()
    salesEnd?: string;

    @IsOptional()
    @IsEnum(TicketStatus)
    status?: TicketStatus;
  }
  