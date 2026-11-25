import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventsService } from './events.service.js';
import { EventCategory, EventStatus } from '../generated/prisma/enums.js';
import { ImageStorageService } from '../common/storage/image-storage.service.js';

type MockPrisma = {
  $transaction: ReturnType<typeof vi.fn>;
  event: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    updateManyAndReturn: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  eventImage: {
    count: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  ticketType: {
    count: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

describe('EventsService', () => {
  let service: EventsService;
  let storage: {
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      $transaction: vi.fn((arg: unknown) =>
        Array.isArray(arg)
          ? Promise.all(arg)
          : (arg as (tx: MockPrisma) => Promise<unknown>)(prisma),
      ),
      event: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        updateManyAndReturn: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      eventImage: {
        count: vi.fn().mockResolvedValue(0),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      ticketType: {
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    storage = {
      save: vi.fn().mockResolvedValue({
        url: 'http://localhost:4000/uploads/events/new.jpg',
        publicId: 'new.jpg',
      }),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ImageStorageService, useValue: storage },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  const ownedEvent = (status: EventStatus, CoverImage: string | null = null) => ({
    id: 'event-1',
    organizerId: 'user-1',
    status,
    CoverImage,
    CoverImagePublicId: CoverImage ? 'old.jpg' : null,
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('defaults to page 1, limit 20 when the query omits them', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);

    const result = await service.findAll({});

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
    expect(result.meta).toEqual({
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('applies skip/take and counts under the same filters', async () => {
    prisma.event.findMany.mockResolvedValue([{ id: 'e1' }]);
    prisma.event.count.mockResolvedValue(45);

    const result = await service.findAll({ page: 3, limit: 20 }, 'user-1');

    const findManyArgs = prisma.event.findMany.mock.calls[0][0] as {
      where: unknown;
      skip: number;
      take: number;
    };

    expect(findManyArgs.skip).toBe(40);
    expect(findManyArgs.take).toBe(20);
    expect(prisma.event.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: findManyArgs.where }),
    );
    expect(result.meta).toMatchObject({
      total: 45,
      page: 3,
      limit: 20,
      totalPages: 3,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('never shows another organizer drafts to a signed-in caller', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);

    await service.findAll({}, 'user-1');

    const { where } = prisma.event.findMany.mock.calls[0][0] as {
      where: unknown;
    };
    expect(where).toEqual({
      OR: [{ status: { not: 'DRAFT' } }, { organizerId: 'user-1' }],
    });
  });

  it('hides drafts entirely from anonymous callers', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);

    await service.findAll({});

    const { where } = prisma.event.findMany.mock.calls[0][0] as {
      where: unknown;
    };
    expect(where).toEqual({ status: { not: 'DRAFT' } });
  });

  it('rejects an unknown category', async () => {
    await expect(
      service.findAllInCategory({ category: 'NOT_A_CATEGORY' }),
    ).rejects.toThrow('Unknown event category');

    expect(prisma.event.findMany).not.toHaveBeenCalled();
  });

  it('filters a known category case-insensitively', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);

    await service.findAllInCategory({ category: 'music' });

    const { where } = prisma.event.findMany.mock.calls[0][0] as {
      where: unknown;
    };
    expect(where).toMatchObject({
      categories: { has: EventCategory.MUSIC },
    });
  });

  describe('lifecycle', () => {
    it('cancels a published event and closes ticket sales', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.PUBLISHED));
      prisma.event.updateManyAndReturn.mockResolvedValue([
        { id: 'event-1', status: EventStatus.CANCELLED },
      ]);
      prisma.event.findUniqueOrThrow.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.CANCELLED,
        images: [],
      });

      const result = await service.cancel('event-1', 'user-1');

      expect(result.status).toBe(EventStatus.CANCELLED);
      expect(prisma.ticketType.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ eventId: 'event-1' }),
          data: { salesEnd: expect.any(Date) },
        }),
      );
    });

    it('refuses to cancel a completed event', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.COMPLETED));

      await expect(service.cancel('event-1', 'user-1')).rejects.toThrow(
        'This event has already ended',
      );
    });

    it('refuses to publish a cancelled event', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.CANCELLED));

      await expect(service.publish('event-1', 'user-1')).rejects.toThrow(
        'This event has been cancelled',
      );
    });

    it('completes only a published event', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.DRAFT));

      await expect(service.complete('event-1', 'user-1')).rejects.toThrow(
        'Only published events can be completed',
      );
    });

    it('refuses to delete an event with sold tickets', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.PUBLISHED));
      prisma.ticketType.count.mockResolvedValue(2);

      await expect(service.delete('user-1', 'event-1')).rejects.toThrow(
        'This event cannot be deleted because tickets have already been sold',
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });

    it('404s when the event belongs to someone else', async () => {
      prisma.event.findFirst.mockResolvedValue(null);

      await expect(service.cancel('event-1', 'user-1')).rejects.toThrow(
        'Event not found',
      );
    });
  });

  describe('cover image', () => {
    it('rejects a missing file', async () => {
      await expect(
        service.uploadCover('event-1', 'user-1', undefined),
      ).rejects.toThrow('Attach the image as the "cover" form field');
    });

    it('rejects a non-image upload', async () => {
      await expect(
        service.uploadCover('event-1', 'user-1', {
          buffer: Buffer.from('x'),
          mimetype: 'application/pdf',
          size: 1,
        }),
      ).rejects.toThrow('Cover image must be a JPEG, PNG or WebP file');
    });

    it('stores the new cover and deletes the previous file', async () => {
      prisma.event.findFirst.mockResolvedValue(
        ownedEvent(EventStatus.DRAFT, 'http://localhost:4000/uploads/events/old.jpg'),
      );
      prisma.event.update.mockResolvedValue({
        id: 'event-1',
        CoverImage: 'http://localhost:4000/uploads/events/new.jpg',
      });

      const result = await service.uploadCover('event-1', 'user-1', {
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
        size: 5,
      });

      expect(result.CoverImage).toBe(
        'http://localhost:4000/uploads/events/new.jpg',
      );
      expect(storage.remove).toHaveBeenCalledWith('old.jpg');
    });

    it('refuses to change the cover of a cancelled event', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.CANCELLED));

      await expect(
        service.uploadCover('event-1', 'user-1', {
          buffer: Buffer.from('image'),
          mimetype: 'image/png',
          size: 5,
        }),
      ).rejects.toThrow('This event has been cancelled');
    });
  });

  describe('gallery images', () => {
    const image = {
      buffer: Buffer.from('image'),
      mimetype: 'image/png',
      size: 5,
    };

    it('rejects an upload with no files', async () => {
      await expect(
        service.addImages('event-1', 'user-1', []),
      ).rejects.toThrow('Attach the images as the "images" form field');
    });

    it('rejects a non-image file', async () => {
      await expect(
        service.addImages('event-1', 'user-1', [
          { ...image, mimetype: 'application/pdf' },
        ]),
      ).rejects.toThrow('Gallery images must be JPEG, PNG or WebP files');
    });

    it('refuses to go past the gallery limit', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.DRAFT));
      prisma.eventImage.count.mockResolvedValue(9);

      await expect(
        service.addImages('event-1', 'user-1', [image, image]),
      ).rejects.toThrow('An event can have at most 10 gallery images');
    });

    it('stores each file and appends it after the existing images', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.DRAFT));
      prisma.eventImage.count.mockResolvedValue(2);

      await service.addImages('event-1', 'user-1', [image, image]);

      expect(storage.save).toHaveBeenCalledTimes(2);

      const { data } = prisma.eventImage.createMany.mock.calls[0][0] as {
        data: { eventId: string; position: number; publicId: string }[];
      };
      expect(data).toHaveLength(2);
      expect(data.map((row) => row.position)).toEqual([2, 3]);
      expect(data.every((row) => row.eventId === 'event-1')).toBe(true);
      expect(data[0].publicId).toBe('new.jpg');
    });

    it('deletes stored files when the rows cannot be written', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.DRAFT));
      prisma.eventImage.createMany.mockRejectedValue(new Error('db down'));

      await expect(
        service.addImages('event-1', 'user-1', [image]),
      ).rejects.toThrow('db down');

      expect(storage.remove).toHaveBeenCalledWith('new.jpg');
    });

    it('removes one image and its file', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.DRAFT));
      prisma.eventImage.findFirst.mockResolvedValue({
        id: 'image-1',
        url: 'http://localhost:4000/uploads/events/a.jpg',
        publicId: 'a.jpg',
      });

      const result = await service.removeImage('event-1', 'image-1', 'user-1');

      expect(prisma.eventImage.delete).toHaveBeenCalledWith({
        where: { id: 'image-1' },
      });
      expect(storage.remove).toHaveBeenCalledWith('a.jpg');
      expect(result).toBe('Image successfully deleted');
    });

    it('404s for an image that is not in the event', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.DRAFT));
      prisma.eventImage.findFirst.mockResolvedValue(null);

      await expect(
        service.removeImage('event-1', 'image-1', 'user-1'),
      ).rejects.toThrow('Image not found');
    });

    it('rejects a reorder that does not list every image exactly once', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.DRAFT));
      prisma.eventImage.findMany.mockResolvedValue([
        { id: 'a' },
        { id: 'b' },
      ]);

      await expect(
        service.reorderImages('event-1', 'user-1', ['a', 'a']),
      ).rejects.toThrow('Send every image id of this event exactly once');
    });

    it('writes the new positions in the given order', async () => {
      prisma.event.findFirst.mockResolvedValue(ownedEvent(EventStatus.DRAFT));
      prisma.eventImage.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

      await service.reorderImages('event-1', 'user-1', ['b', 'a']);

      expect(prisma.eventImage.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'b' },
        data: { position: 0 },
      });
      expect(prisma.eventImage.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'a' },
        data: { position: 1 },
      });
    });
  });
});
