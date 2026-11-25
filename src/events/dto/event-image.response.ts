import { ApiProperty } from '@nestjs/swagger';
import { galleryImageExample } from '../../common/swagger/samples.js';

export class EventImageResponse {
  @ApiProperty({ format: 'uuid', example: galleryImageExample.id })
  id: string;

  @ApiProperty({ format: 'uuid', example: galleryImageExample.eventId })
  eventId: string;

  @ApiProperty({
    description: 'Public URL of the stored image.',
    example: galleryImageExample.url,
  })
  url: string;

  @ApiProperty({
    description: 'Display order, lowest first.',
    example: galleryImageExample.position,
  })
  position: number;

  @ApiProperty({ format: 'date-time', example: galleryImageExample.createdAt })
  createdAt: string;
}
