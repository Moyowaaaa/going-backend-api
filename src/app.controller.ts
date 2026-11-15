import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { ApiWrappedResponse } from './common/swagger/api-wrapped-response.js';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiWrappedResponse({
    status: HttpStatus.OK,
    description: 'The process is up.',
    example: 'Hello World!',
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
