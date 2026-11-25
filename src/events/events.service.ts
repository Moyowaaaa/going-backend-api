import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
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
import {
  ImageStorageService,
  isAllowedImage,
  MAX_GALLERY_IMAGES,
  type UploadedImage,
} from '../common/storage/image-storage.service.js';

/**
 * Every event payload carries its gallery in display order, and never the
 * storage ids used to delete files.
 */
const EVENT_WITH_IMAGES = {
  omit: { CoverImagePublicId: true },
  include: {
    images: { orderBy: { position: 'asc' }, omit: { publicId: true } },
  },
} as const;

@Injectable()
export class EventsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storage: ImageStorageService,
  ) {}

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
        ...EVENT_WITH_IMAGES,
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

  //Find single event by slug
  async findOneSlug(slug: string) {
    const event = await this.prismaService.event.findUnique({
      where: {
        slug: slug,
      },
      ...EVENT_WITH_IMAGES,
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
      ...EVENT_WITH_IMAGES,
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

  private async findOwnedEvent(eventId: string, userId: string) {
    const event = await this.prismaService.event.findFirst({
      where: { id: eventId, organizerId: userId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  /** Drafts and published events can still change; finished ones cannot. */
  private assertMutable(status: EventStatus) {
    if (status === EventStatus.CANCELLED) {
      throw new BadRequestException('This event has been cancelled');
    }

    if (status === EventStatus.COMPLETED) {
      throw new BadRequestException('This event has already ended');
    }
  }

  //Publish event
  async publish(eventId: string, userId: string) {
    const event = await this.findOwnedEvent(eventId, userId);

    if (event.status === EventStatus.PUBLISHED) {
      throw new BadRequestException('This event is already published');
    }

    this.assertMutable(event.status);

    const updated = await this.prismaService.event.updateManyAndReturn({
      where: { id: eventId, status: EventStatus.DRAFT },
      data: { status: EventStatus.PUBLISHED },
    });

    if (updated.length === 0) {
      throw new BadRequestException('Only draft events can be published');
    }

    return this.findEventWithImages(eventId);
  }

  //Cancel event
  async cancel(eventId: string, userId: string) {
    const event = await this.findOwnedEvent(eventId, userId);

    this.assertMutable(event.status);

    const cancelled = await this.prismaService.$transaction(async (tx) => {
      const updated = await tx.event.updateManyAndReturn({
        where: {
          id: eventId,
          status: { in: [EventStatus.DRAFT, EventStatus.PUBLISHED] },
        },
        data: { status: EventStatus.CANCELLED },
      });

      if (updated.length === 0) return null;

      // Stop sales immediately on every ticket type of the event.
      const now = new Date();
      await tx.ticketType.updateMany({
        where: {
          eventId,
          OR: [{ salesEnd: null }, { salesEnd: { gt: now } }],
        },
        data: { salesEnd: now },
      });

      return updated[0];
    });

    if (!cancelled) {
      throw new BadRequestException(
        'Only draft or published events can be cancelled',
      );
    }

    return this.findEventWithImages(eventId);
  }

  //Complete event
  async complete(eventId: string, userId: string) {
    const event = await this.findOwnedEvent(eventId, userId);

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only published events can be completed',
      );
    }

    const completed = await this.prismaService.event.updateManyAndReturn({
      where: { id: eventId, status: EventStatus.PUBLISHED },
      data: { status: EventStatus.COMPLETED },
    });

    if (completed.length === 0) {
      throw new BadRequestException(
        'Only published events can be completed',
      );
    }

    return this.findEventWithImages(eventId);
  }

  //Update single event
  async update(eventId: string, userId: string, dto: UpdateEventDTO) {
    const event = await this.findOwnedEvent(eventId, userId);

    this.assertMutable(event.status);

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
      ...EVENT_WITH_IMAGES,
    });
  }

  /** Loads one event with its gallery in display order. */
  private findEventWithImages(eventId: string) {
    return this.prismaService.event.findUniqueOrThrow({
      where: { id: eventId },
      ...EVENT_WITH_IMAGES,
    });
  }

  //Replace the cover image with an uploaded file
  async uploadCover(
    eventId: string,
    userId: string,
    file: UploadedImage | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Attach the image as the "cover" form field',
      );
    }

    if (!isAllowedImage(file.mimetype)) {
      throw new BadRequestException(
        'Cover image must be a JPEG, PNG or WebP file',
      );
    }

    const event = await this.findOwnedEvent(eventId, userId);

    this.assertMutable(event.status);

    const stored = await this.storage.save(eventId, file);

    const updated = await this.prismaService.event.update({
      where: { id: eventId },
      data: {
        CoverImage: stored.url,
        CoverImagePublicId: stored.publicId,
      },
      ...EVENT_WITH_IMAGES,
    });

    await this.storage.remove(event.CoverImagePublicId);

    return updated;
  }

  //Clear the cover image
  async removeCover(eventId: string, userId: string) {
    const event = await this.findOwnedEvent(eventId, userId);

    this.assertMutable(event.status);

    const updated = await this.prismaService.event.update({
      where: { id: eventId },
      data: { CoverImage: null, CoverImagePublicId: null },
      ...EVENT_WITH_IMAGES,
    });

    await this.storage.remove(event.CoverImagePublicId);

    return updated;
  }

  /** Adds images to the event gallery, one row per uploaded file. */
  async addImages(
    eventId: string,
    userId: string,
    files: UploadedImage[] | undefined,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Attach the images as the "images" form field',
      );
    }

    const invalid = files.find((file) => !isAllowedImage(file.mimetype));
    if (invalid) {
      throw new BadRequestException(
        'Gallery images must be JPEG, PNG or WebP files',
      );
    }

    const event = await this.findOwnedEvent(eventId, userId);

    this.assertMutable(event.status);

    const existing = await this.prismaService.eventImage.count({
      where: { eventId },
    });

    if (existing + files.length > MAX_GALLERY_IMAGES) {
      throw new BadRequestException(
        `An event can have at most ${MAX_GALLERY_IMAGES} gallery images`,
      );
    }

    const stored: { url: string; publicId: string }[] = [];
    try {
      for (const file of files) {
        stored.push(await this.storage.save(eventId, file));
      }

      const startPosition = existing;

      await this.prismaService.eventImage.createMany({
        data: stored.map((image, index) => ({
          eventId,
          url: image.url,
          publicId: image.publicId,
          position: startPosition + index,
        })),
      });
    } catch (error) {
      // Do not leave stored files behind when the rows could not be written.
      await Promise.all(stored.map((image) => this.storage.remove(image.publicId)));
      throw error;
    }

    return this.prismaService.eventImage.findMany({
      where: { eventId },
      orderBy: { position: 'asc' },
      omit: { publicId: true },
    });
  }

  /** Removes one gallery image; the cover image is unchanged. */
  async removeImage(eventId: string, imageId: string, userId: string) {
    await this.findOwnedEvent(eventId, userId);

    const image = await this.prismaService.eventImage.findFirst({
      where: { id: imageId, eventId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    await this.prismaService.eventImage.delete({ where: { id: image.id } });
    await this.storage.remove(image.publicId);

    return 'Image successfully deleted';
  }

  /** Reorders the gallery; every image id of the event must be sent. */
  async reorderImages(eventId: string, userId: string, imageIds: string[]) {
    const event = await this.findOwnedEvent(eventId, userId);

    this.assertMutable(event.status);

    const images = await this.prismaService.eventImage.findMany({
      where: { eventId },
      select: { id: true },
    });

    const known = new Set(images.map((image) => image.id));
    const unique = new Set(imageIds);

    if (
      unique.size !== imageIds.length ||
      imageIds.length !== images.length ||
      imageIds.some((id) => !known.has(id))
    ) {
      throw new BadRequestException(
        'Send every image id of this event exactly once',
      );
    }

    await this.prismaService.$transaction(
      imageIds.map((id, position) =>
        this.prismaService.eventImage.update({
          where: { id },
          data: { position },
        }),
      ),
    );

    return this.prismaService.eventImage.findMany({
      where: { eventId },
      orderBy: { position: 'asc' },
      omit: { publicId: true },
    });
  }

  //delete single event
  async delete(userId: string, eventId: string) {
    await this.findOwnedEvent(eventId, userId);

    const soldTickets = await this.prismaService.ticketType.count({
      where: { eventId, sold: { gt: 0 } },
    });

    if (soldTickets > 0) {
      throw new ConflictException(
        'This event cannot be deleted because tickets have already been sold',
      );
    }

    try {
      await this.prismaService.event.delete({
        where: {
          id: eventId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'This event cannot be deleted because orders reference it',
        );
      }
      throw error;
    }

    return 'Event successfully deleted';
  }
}
