import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { VenueInputDto } from './dto/venue-input.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';
import { ListVenuesDto } from './dto/list-venues.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import {
paginate,
paginationArgs,
} from '../common/utils/pagination.util.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class VenuesService {
constructor(private readonly prisma: PrismaService) {}

private async listVenues(
where: Prisma.VenueWhereInput,
pagination: Partial<PaginationDto>,
) {
const args = paginationArgs(pagination.page, pagination.limit);

const [data, total] = await this.prisma.$transaction([
this.prisma.venue.findMany({
where,
orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
skip: args.skip,
take: args.take,
}),
this.prisma.venue.count({ where }),
]);

return paginate(data, total, args);
}

async findAll(dto: ListVenuesDto) {
const where: Prisma.VenueWhereInput = dto.q
? {
OR: [
{ name: { contains: dto.q, mode: 'insensitive' } },
{ city: { contains: dto.q, mode: 'insensitive' } },
],
}
: {};

return this.listVenues(where, dto);
}

async findOne(id: string) {
const venue = await this.prisma.venue.findUnique({ where: { id } });

if (!venue) {
throw new NotFoundException('Venue not found');
}

return venue;
}

async create(dto: VenueInputDto) {
return this.prisma.venue.create({
data: {
name: dto.name,
address: dto.address,
city: dto.city,
state: dto.state,
country: dto.country,
capacity: dto.capacity,
latitude: dto.latitude,
longitude: dto.longitude,
},
});
}

async update(id: string, dto: UpdateVenueDto) {
await this.findOne(id);

return this.prisma.venue.update({
where: { id },
data: {
...(dto.name !== undefined ? { name: dto.name } : {}),
...(dto.address !== undefined ? { address: dto.address } : {}),
...(dto.city !== undefined ? { city: dto.city } : {}),
...(dto.state !== undefined ? { state: dto.state } : {}),
...(dto.country !== undefined ? { country: dto.country } : {}),
...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
},
});
}

async delete(id: string) {
await this.findOne(id);

// Event.venueId is ON DELETE SET NULL, so events keep existing
// with venueId cleared rather than being deleted with the venue.
await this.prisma.venue.delete({ where: { id } });

return 'Venue successfully deleted';
}
}
