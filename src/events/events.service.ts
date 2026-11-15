import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateEventDTO } from './dto/update-event-dto.js';
import { CreateEventDto } from './dto/create-event-dto.js';
import { generateEventSlug } from '../common/utils/slug.util.js';
import { EventCategory } from '../generated/prisma/enums.js';

@Injectable()
export class EventsService {
  constructor(private readonly prismaService: PrismaService) {}
  //Find all events
  async findAll(q: string = '') {
    return await this.prismaService.event.findMany({
      where: q
        ? {
            title: {
              contains: q,
              mode: 'insensitive',
            },
          }
        : {},
    });
  }

  async findAllInCategory(filters: { category?: string }) {
    const category = filters.category?.toUpperCase();
    const categories = Object.values(EventCategory) as string[];

    if (category && !categories.includes(category)) {
      throw new BadRequestException('Unknown event category');
    }

    return this.prismaService.event.findMany({
      where: category ? { categories: { has: category as EventCategory } } : {},
    });
  }

  /**
   * Turns what the user sent into what we store: de-duplicated, with "OTHER"
   * standing alone and an empty selection falling back to "OTHER".
   */
  private resolveCategories(categories?: EventCategory[]): EventCategory[] {
    const selected = [...new Set(categories ?? [])];

    if (selected.length === 0) return [EventCategory.OTHER];

    if (selected.includes(EventCategory.OTHER) && selected.length > 1) {
      throw new BadRequestException(
        `"${EventCategory.OTHER}" cannot be combined with other categories`,
      );
    }

    return selected;
  }

  //   //Find single event by id
  //   async findOne(id: number) {
  //     const event = await this.prismaService.event.findUnique({
  //       where: {
  //         id: id,
  //       },
  //     });

  //     if (!event) throw new NotFoundException(`No event with id: ${id} found`);
  //     return event;
  //   }

  //Find single event by slug
  async findOneSlug(slug: string) {
    const event = await this.prismaService.event.findUnique({
      where: {
        slug: slug,
      },
    });
    if (!event)
      throw new NotFoundException(`No event with slug: ${slug} found`);
    return event;
  }

  //Create event
  async create(dto: CreateEventDto, organizerId: string) {
    return this.prismaService.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        endDate: dto.endDate,
        startDate: dto.startDate,
        CoverImage: dto.coverImage,
        slug: generateEventSlug(dto.title, new Date(dto.startDate)),
        organizerId,
        categories: this.resolveCategories(dto.categories),
      },
    });
  }


  //Publish event
  async publish(eventId: string, userId: string) {
    const event = await this.prismaService.event.findFirst({
      where: {
        id: eventId,
        organizerId: userId,
      },
    });
  
    if (!event) {
      throw new NotFoundException('Event not found');
    }
  
    return this.prismaService.event.update({
      where: {
        id: eventId,
      },
      data: {
        status: 'PUBLISHED',
      },
    });
  }

  //Update single event
  async update(eventId: string, userId: string, dto: UpdateEventDTO) {
    const event = await this.prismaService.event.findFirst({
      where: {
        id: eventId,
        organizerId: userId,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (userId !== event.organizerId) {
      throw new UnauthorizedException(
        'You are not authorized to perfrom this action',
      );
    }

    return this.prismaService.event.update({
      where: {
        id: eventId,
      },
      data: {
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate,
        endDate: dto.endDate,
        accentColor: dto.accentColor,
        CoverImage: dto.coverImage,
        venueId: dto.venueId,
      },
    });
  }

  //delete single event
  async delete(userId: string, eventId: string) {
    const event = await this.prismaService.event.findFirst({
      where: {
        id: eventId,
        organizerId: userId,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (userId !== event.organizerId) {
      throw new UnauthorizedException(
        'You are not authorized to perfrom this action',
      );
    }

    await this.prismaService.event.delete({
      where: {
        id: eventId,
      },
    });

    return 'Event successfully deleted';
  }
}
