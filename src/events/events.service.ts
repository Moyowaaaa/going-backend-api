import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateEventDTO } from './dto/update-event.dto.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { generateEventSlug } from '../common/utils/slug.util.js';
import { EventCategory, EventStatus } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { ListEventsDto } from './dto/list-events.dto.js';
import type { PaginationDto } from '../common/dto/pagination.dto.js';
import {
  paginate,
  paginationArgs,
} from '../common/utils/pagination.util.js';

@Injectable()
export class EventsService {
  constructor(private readonly prismaService: PrismaService) {}

 
  private async listEvents(
    where: Prisma.EventWhereInput,
    pagination: Partial<PaginationDto>,
  ) {
    const args = paginationArgs(pagination.page, pagination.limit);

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.event.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: args.skip,
        take: args.take,
      }),
      this.prismaService.event.count({ where }),
    ]);

    return paginate(data, total, args);
  }

  /**
   * Everyone sees non-draft events; a signed-in caller also sees their own
   * drafts. Drafts owned by anyone else never appear.
   */
  private visibility(userId?: string): Prisma.EventWhereInput {
    const visible: Prisma.EventWhereInput = {
      status: { not: EventStatus.DRAFT },
    };

    return userId
      ? { OR: [visible, { organizerId: userId }] }
      : visible;
  }

  async findAll(dto: ListEventsDto, userId?: string) {
    const where: Prisma.EventWhereInput = {
      ...this.visibility(userId),
      ...(dto.q
        ? { title: { contains: dto.q, mode: 'insensitive' } }
        : {}),
    };

    return this.listEvents(where, dto);
  }

  async findAllInCategory(dto: ListEventsDto, userId?: string) {
    const category = dto.category?.toUpperCase();
    const categories = Object.values(EventCategory) as string[];

    if (category && !categories.includes(category)) {
      throw new BadRequestException('Unknown event category');
    }

    const where: Prisma.EventWhereInput = {
      ...this.visibility(userId),
      ...(category ? { categories: { has: category as EventCategory } } : {}),
    };

    return this.listEvents(where, dto);
  }

  async findMine(userId: string, pagination: Partial<PaginationDto>) {
    return this.listEvents({ organizerId: userId }, pagination);
  }


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
    const venueId = await this.resolveVenueId(dto);

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
        venueId,
      },
    });
  }

  /**
   * Resolves the venue for an event payload. The client sends either an
   * existing `venueId` or a nested `venue` picked from a place search; the
   * nested form is created here so the event and its venue land together.
   */
  private async resolveVenueId(dto: Partial<CreateEventDto>): Promise<string | undefined> {
    const nested = dto.venueInput;

    if (dto.venueId && nested?.venue) {
      throw new BadRequestException(
        'Send either venueId or venue, not both',
      );
    }

    if (nested?.venueId && nested.venue) {
      throw new BadRequestException(
        'Send either venueId or venue, not both',
      );
    }

    const existingId = dto.venueId ?? nested?.venueId;

    if (existingId) {
      await this.assertVenueExists(existingId);
      return existingId;
    }

    if (nested?.venue) {
      const venue = await this.prismaService.venue.create({
        data: {
          name: nested.venue.name,
          address: nested.venue.address,
          city: nested.venue.city,
          state: nested.venue.state,
          country: nested.venue.country,
          capacity: nested.venue.capacity,
          latitude: nested.venue.latitude,
          longitude: nested.venue.longitude,
        },
        select: { id: true },
      });

      return venue.id;
    }

    return undefined;
  }

  private async assertVenueExists(venueId: string) {
    const venue = await this.prismaService.venue.findUnique({
      where: { id: venueId },
      select: { id: true },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
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

    const venueId = await this.resolveVenueId(dto);

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
        venueId,
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
