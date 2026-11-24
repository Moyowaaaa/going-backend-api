import { ApiProperty } from '@nestjs/swagger';
import { venueExample } from '../../common/swagger/samples.js';

export class VenueResponse {
@ApiProperty({ format: 'uuid', example: venueExample.id })
id: string;

@ApiProperty({ example: venueExample.name })
name: string;

@ApiProperty({ example: venueExample.address })
address: string;

@ApiProperty({ example: venueExample.city })
city: string;

@ApiProperty({
nullable: true,
example: venueExample.state,
})
state: string | null;

@ApiProperty({ example: venueExample.country })
country: string;

@ApiProperty({
nullable: true,
example: venueExample.capacity,
})
capacity: number | null;

@ApiProperty({
nullable: true,
example: venueExample.latitude,
})
latitude: number | null;

@ApiProperty({
nullable: true,
example: venueExample.longitude,
})
longitude: number | null;

@ApiProperty({ format: 'date-time', example: venueExample.createdAt })
createdAt: string;

@ApiProperty({ format: 'date-time', example: venueExample.updatedAt })
updatedAt: string;
}
