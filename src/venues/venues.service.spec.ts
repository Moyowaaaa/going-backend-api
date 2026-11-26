import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { VenuesService } from './venues.service.js';

describe('VenuesService', () => {
let service: VenuesService;
let prisma: {
$transaction: ReturnType<typeof vi.fn>;
venue: {
findMany: ReturnType<typeof vi.fn>;
count: ReturnType<typeof vi.fn>;
findUnique: ReturnType<typeof vi.fn>;
create: ReturnType<typeof vi.fn>;
update: ReturnType<typeof vi.fn>;
delete: ReturnType<typeof vi.fn>;
};
};

beforeEach(async () => {
prisma = {
$transaction: vi.fn((queries: Promise<unknown>[]) =>
Promise.all(queries),
),
venue: {
findMany: vi.fn(),
count: vi.fn(),
findUnique: vi.fn(),
create: vi.fn(),
update: vi.fn(),
delete: vi.fn(),
},
};

const module: TestingModule = await Test.createTestingModule({
providers: [
VenuesService,
{ provide: PrismaService, useValue: prisma },
],
}).compile();

service = module.get<VenuesService>(VenuesService);
});

it('should be defined', () => {
expect(service).toBeDefined();
});

it('defaults to page 1, limit 20 when the query omits them', async () => {
prisma.venue.findMany.mockResolvedValue([]);
prisma.venue.count.mockResolvedValue(0);

const result = await service.findAll({});

expect(prisma.venue.findMany).toHaveBeenCalledWith(
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

it('matches q against name or city case-insensitively', async () => {
prisma.venue.findMany.mockResolvedValue([]);
prisma.venue.count.mockResolvedValue(0);

await service.findAll({ q: 'lagos' });

const { where } = prisma.venue.findMany.mock.calls[0][0] as {
where: unknown;
};
expect(where).toEqual({
OR: [
{ name: { contains: 'lagos', mode: 'insensitive' } },
{ city: { contains: 'lagos', mode: 'insensitive' } },
],
});
});

it('throws when the venue does not exist', async () => {
prisma.venue.findUnique.mockResolvedValue(null);

await expect(service.findOne('missing-id')).rejects.toThrow(
'Venue not found',
);
});

it('creates a venue with the given fields', async () => {
prisma.venue.create.mockResolvedValue({ id: 'v1' });

const result = await service.create({
name: 'Freedom Park',
address: '1 Independence Way',
city: 'Lagos',
country: 'Nigeria',
capacity: 5000,
});

expect(prisma.venue.create).toHaveBeenCalledWith({
data: expect.objectContaining({ name: 'Freedom Park', city: 'Lagos' }),
});
expect(result).toEqual({ id: 'v1' });
});

it('updates only the fields that were sent', async () => {
prisma.venue.findUnique.mockResolvedValue({ id: 'v1' });
prisma.venue.update.mockResolvedValue({ id: 'v1', city: 'Abuja' });

await service.update('v1', { city: 'Abuja' });

expect(prisma.venue.update).toHaveBeenCalledWith({
where: { id: 'v1' },
data: { city: 'Abuja' },
});
});

it('deletes the venue after confirming it exists', async () => {
prisma.venue.findUnique.mockResolvedValue({ id: 'v1' });
prisma.venue.delete.mockResolvedValue({ id: 'v1' });

const result = await service.delete('v1');

expect(prisma.venue.delete).toHaveBeenCalledWith({ where: { id: 'v1' } });
expect(result).toBe('Venue successfully deleted');
});

it('does not delete a venue that does not exist', async () => {
prisma.venue.findUnique.mockResolvedValue(null);

await expect(service.delete('missing-id')).rejects.toThrow(
'Venue not found',
);
expect(prisma.venue.delete).not.toHaveBeenCalled();
});
});
