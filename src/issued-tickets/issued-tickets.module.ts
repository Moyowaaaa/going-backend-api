import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { IssuedTicketsController } from './issued-tickets.controller.js';
import { IssuedTicketsService } from './issued-tickets.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [IssuedTicketsController],
  providers: [IssuedTicketsService],
})
export class IssuedTicketsModule {}
