import { Test, TestingModule } from '@nestjs/testing';
import { EventsTicketsController } from './events-tickets.controller.js';

describe('EventsTicketsController', () => {
  let controller: EventsTicketsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsTicketsController],
    }).compile();

    controller = module.get<EventsTicketsController>(EventsTicketsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
