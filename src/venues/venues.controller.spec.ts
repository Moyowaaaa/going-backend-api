import { Test, TestingModule } from '@nestjs/testing';
import { VenuesController } from './venues.controller.js';
import { VenuesService } from './venues.service.js';

describe('VenuesController', () => {
let controller: VenuesController;

beforeEach(async () => {
process.env.JWT_SECRET ??= 'venues-controller-spec';

const module: TestingModule = await Test.createTestingModule({
controllers: [VenuesController],
providers: [{ provide: VenuesService, useValue: {} }],
}).compile();

controller = module.get<VenuesController>(VenuesController);
});

it('should be defined', () => {
expect(controller).toBeDefined();
});
});
