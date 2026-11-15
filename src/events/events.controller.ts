import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service.js';
import { AuthGuard } from '../auth/guards/auth.guards.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateEventDto } from './dto/create-event-dto.js';
import { UpdateEventDTO } from './dto/update-event-dto.js';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}
  //GET '/events' - optional ?q= text search and ?category= filter
  @Get()
  findAll(@Query('q') q?: string, @Query('category') category?: string) {
    if (category) return this.eventsService.findAllInCategory({ category });
    return this.eventsService.findAll(q);
  }

  //GET single event by slug '/events/:slug
  @Get(':slug')
  findOneSlug(@Param('slug') slug: string) {
    return this.eventsService.findOneSlug(slug);
  }

  //POST create event '/events'
  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateEventDto, @CurrentUser('id') organizerId: string) {
    return this.eventsService.create(dto, organizerId);
  }

  //Publish event 
  @Post(':id')
  @UseGuards(AuthGuard)
  publish( @Param('id') id: string,
  @Body() dto: UpdateEventDTO,
  @CurrentUser('id') organizerId: string,
) {
  return this.eventsService.publish(id, organizerId);
}

  

  //PUT update single event '/events/:id'
  @Put(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDTO,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.eventsService.update(id, organizerId, dto);
  }

  //Delete update single event '/events/:id'
  @Delete(':id')
  @UseGuards(AuthGuard)
  delete(@Param('id') id: string, @CurrentUser('id') organizerId: string) {
    return this.eventsService.delete(organizerId, id);
  }
}
