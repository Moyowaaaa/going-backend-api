import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { TicketsService } from './tickets.service.js';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    ticketType: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: vi.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
      ticketType: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('defaults to page 1, limit 20 when the query omits them', async () => {
    prisma.ticketType.findMany.mockResolvedValue([]);
    prisma.ticketType.count.mockResolvedValue(0);

    const result = await service.findAll('event-1', {});

    const args = prisma.ticketType.findMany.mock.calls[0][0] as {
      where: unknown;
      skip: number;
      take: number;
    };
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
    expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 0 });
  });

  it('keeps only PUBLISHED ticket types of the event in both queries', async () => {
    prisma.ticketType.findMany.mockResolvedValue([]);
    prisma.ticketType.count.mockResolvedValue(7);

    const result = await service.findAll('event-1', { page: 2, limit: 5 });
    const args = prisma.ticketType.findMany.mock.calls[0][0] as {
      where: unknown;
      skip: number;
      take: number;
    };
    expect(args.where).toEqual({
      eventId: 'event-1',
      status: 'PUBLISHED',
    });
    expect(prisma.ticketType.count).toHaveBeenCalledWith({
      where: args.where,
    });
    expect(args.skip).toBe(5);
    expect(args.take).toBe(5);
    expect(result.meta).toMatchObject({
      total: 7,
      page: 2,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('shows the organizer their own drafts alongside published ticket types', async () => {
    prisma.ticketType.findMany.mockResolvedValue([]);
    prisma.ticketType.count.mockResolvedValue(0);

    await service.findAll('event-1', {}, 'user-1');

    const args = prisma.ticketType.findMany.mock.calls[0][0] as {
      where: unknown;
    };
    const published = { eventId: 'event-1', status: 'PUBLISHED' };

    expect(args.where).toEqual({
      eventId: 'event-1',
      OR: [published, { event: { organizerId: 'user-1' } }],
    });
    // count must see the same rows as the page, drafts included
    expect(prisma.ticketType.count).toHaveBeenCalledWith({
      where: args.where,
    });
  });

  it('hides drafts from anonymous callers', async () => {
    prisma.ticketType.findMany.mockResolvedValue([]);
    prisma.ticketType.count.mockResolvedValue(0);

    await service.findAll('event-1', {});

    const args = prisma.ticketType.findMany.mock.calls[0][0] as {
      where: unknown;
    };
    expect(args.where).toEqual({ eventId: 'event-1', status: 'PUBLISHED' });
    expect(args.where).not.toHaveProperty('OR');
  });

  it('scopes findOne to the same visibility rule', async () => {
    prisma.ticketType.findFirst = vi.fn().mockResolvedValue({ id: 't1' });

    await service.findOne('t1', 'event-1', 'user-1');

    expect(prisma.ticketType.findFirst).toHaveBeenCalledWith({
      where: {
        id: 't1',
        eventId: 'event-1',
        OR: [
          { eventId: 'event-1', status: 'PUBLISHED' },
          { event: { organizerId: 'user-1' } },
        ],
      },
    });
  });
});
