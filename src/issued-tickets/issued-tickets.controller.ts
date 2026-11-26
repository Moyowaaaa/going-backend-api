import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiControllerTag } from '../common/decorators/api-controller-tag.decorator.js';
import {
  ApiCreate,
  ApiGet,
} from '../common/decorators/api-operation.decorator.js';
import {
  ApiConflict,
  ApiNotFound,
  ApiValidationError,
} from '../common/decorators/api-error.decorator.js';
import { AuthGuard } from '../auth/guards/auth.guards.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { IssuedTicketsService } from './issued-tickets.service.js';

@UseGuards(AuthGuard)
@ApiControllerTag('Issued tickets')
@Controller()
export class IssuedTicketsController {
  constructor(private readonly service: IssuedTicketsService) {}

  @Get('my-tickets')
  @ApiGet({
    summary: 'List my tickets',
    description:
      'Every issued ticket bought by the signed-in user, with its ticket type, event and order reference. Includes the qrToken used for check-in.',
    responseDescription: 'The buyer’s tickets, newest first.',
    example: [
      {
        id: '2c9f8e7d-6c5b-4a39-8271-0f9e8d7c6b5a',
        ticketNumber: 'GO-A1B2C3D4-1',
        status: 'VALID',
        qrToken: 'b7f2c1...',
      },
    ],
    protected: true,
  })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findMine(user.id);
  }

  @Post('check-in')
  @ApiCreate({
    summary: 'Check in a ticket (organizer only)',
    description:
      'Marks a VALID ticket as USED. Only the organizer of the ticket’s event may scan it.',
    responseDescription: 'The checked-in ticket.',
    example: {
      id: '2c9f8e7d-6c5b-4a39-8271-0f9e8d7c6b5a',
      ticketNumber: 'GO-A1B2C3D4-1',
      status: 'USED',
      checkedInAt: '2026-11-25T12:00:00.000Z',
    },
    protected: true,
  })
  @ApiValidationError('qrToken is missing.', 'qrToken must be longer than 10 characters')
  @ApiNotFound('No ticket uses this qrToken.', 'Ticket not found.')
  @ApiConflict('The ticket was already scanned.', 'Ticket is already used.')
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckInDto) {
    return this.service.checkIn(user.id, dto.qrToken);
  }
}
