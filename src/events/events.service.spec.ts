import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventsService } from './events.service.js';
import { EventCategory } from '../generated/prisma/enums.js';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    event: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: vi.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
      event: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
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
});
