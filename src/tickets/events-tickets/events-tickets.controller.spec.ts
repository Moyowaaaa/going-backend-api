import { Test, TestingModule } from '@nestjs/testing';
import { EventsTicketsController } from './events-tickets.controller.js';
import { TicketsService } from '../tickets.service.js';

describe('EventsTicketsController', () => {
  let controller: EventsTicketsController;

  beforeAll(() => {
    process.env.JWT_SECRET ??= 'events-tickets-controller-spec';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsTicketsController],
      providers: [{ provide: TicketsService, useValue: {} }],
    }).compile();

    controller = module.get<EventsTicketsController>(EventsTicketsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
