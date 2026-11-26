import { PartialType } from '@nestjs/swagger';
import { VenueInputDto } from './venue-input.dto.js';

export class UpdateVenueDto extends PartialType(VenueInputDto) {}
