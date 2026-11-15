import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ApiControllerTag } from './common/decorators/api-controller-tag.decorator.js';
import { ApiGet } from './common/decorators/api-operation.decorator.js';

@ApiControllerTag('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiGet({
    summary: 'Liveness check',
    responseDescription: 'The process is up.',
    example: 'Hello World!',
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
