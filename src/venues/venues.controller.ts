import {
Body,
Controller,
Delete,
Get,
Param,
Patch,
Post,
Query,
UseGuards,
} from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { VenuesService } from './venues.service.js';
import { AuthGuard } from '../auth/guards/auth.guards.js';
import { VenueInputDto } from './dto/venue-input.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';
import { ListVenuesDto } from './dto/list-venues.dto.js';
import { VenueResponse } from './dto/venue.response.js';
import { venueExample } from '../common/swagger/samples.js';
import { ApiControllerTag } from '../common/decorators/api-controller-tag.decorator.js';
import {
ApiCreate,
ApiDelete,
ApiGet,
ApiPaginatedList,
ApiUpdate,
} from '../common/decorators/api-operation.decorator.js';
import {
ApiNotFound,
ApiValidationError,
} from '../common/decorators/api-error.decorator.js';

@ApiControllerTag('Venues')
@Controller('venues')
export class VenuesController {
constructor(private readonly venuesService: VenuesService) {}

@Get()
@ApiPaginatedList({
summary: 'List venues',
description:
'Returns venues, newest first. Pass q to match the name or city (case-insensitive). Paginated with page and limit; order is createdAt descending, then id.',
responseDescription: 'One page of matching venues.',
model: VenueResponse,
example: [venueExample],
})
@ApiValidationError('page or limit failed validation.', [
'limit must not be greater than 100',
])
findAll(@Query() query: ListVenuesDto) {
return this.venuesService.findAll(query);
}

@Get(':id')
@ApiGet({
summary: 'Get a venue by id',
responseDescription: 'The venue.',
model: VenueResponse,
example: venueExample,
})
@ApiParam({
name: 'id',
format: 'uuid',
example: venueExample.id,
})
@ApiNotFound('No venue uses this id.', 'Venue not found')
findOne(@Param('id') id: string) {
return this.venuesService.findOne(id);
}

@Post()
@UseGuards(AuthGuard)
@ApiCreate({
summary: 'Create a venue',
description:
'Creates a venue. state, capacity, latitude and longitude are optional.',
responseDescription: 'Venue created.',
model: VenueResponse,
example: venueExample,
protected: true,
})
@ApiValidationError('The body failed validation.', [
'name must be longer than or equal to 3 characters',
])
create(@Body() dto: VenueInputDto) {
return this.venuesService.create(dto);
}

@Patch(':id')
@UseGuards(AuthGuard)
@ApiUpdate({
summary: 'Update a venue',
description:
'Updates a venue. Omitted fields stay as they are.',
responseDescription: 'Venue updated.',
model: VenueResponse,
example: venueExample,
protected: true,
})
@ApiParam({
name: 'id',
format: 'uuid',
example: venueExample.id,
})
@ApiValidationError('The body failed validation.', [
'capacity must not be less than 1',
])
@ApiNotFound('No venue uses this id.', 'Venue not found')
update(@Param('id') id: string, @Body() dto: UpdateVenueDto) {
return this.venuesService.update(id, dto);
}

@Delete(':id')
@UseGuards(AuthGuard)
@ApiDelete({
summary: 'Delete a venue',
description:
'Deletes a venue. Events that referenced it keep existing with venueId cleared.',
responseDescription: 'Venue deleted.',
example: 'Venue successfully deleted',
protected: true,
})
@ApiParam({
name: 'id',
format: 'uuid',
example: venueExample.id,
})
@ApiNotFound('No venue uses this id.', 'Venue not found')
delete(@Param('id') id: string) {
return this.venuesService.delete(id);
}
}
