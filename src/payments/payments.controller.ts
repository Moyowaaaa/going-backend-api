import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiControllerTag } from '../common/decorators/api-controller-tag.decorator.js';
import { AuthGuard } from '../auth/guards/auth.guards.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { PaymentsService } from './payments.service.js';
import { InitializePaymentDto } from './dto/initialize-payment.dto.js';
import {
  PaymentInitResponse,
  WebhookResponse,
} from './dto/payment-init.response.js';

@ApiControllerTag('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:id/pay')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start payment for a pending order',
    description:
      'Creates a charge with the configured provider (Paystack by default) and returns its hosted checkout URL. The order reservation stays held until it expires.',
  })
  @ApiResponse({ status: 201, type: PaymentInitResponse })
  @ApiResponse({ status: 400, description: 'Order expired or already paid' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 503, description: 'Payments are not configured' })
  initialize(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) orderId: string,
 @Body() dto: InitializePaymentDto,
  ) {
    return this.paymentsService.initialize(user.id, orderId, dto.returnUrl);
  }

  @Post('webhooks/flutterwave')
  @ApiTags('Webhooks')
  @ApiOperation({
    summary: 'Flutterwave charge webhook',
    description:
      'Verifies the verif-hash header and the transaction with Flutterwave, then marks the order paid and issues tickets. Safe to retry.',
  })
  @ApiHeader({
    name: 'verif-hash',
    description: 'FLUTTERWAVE_WEBHOOK_HASH from your .env',
    required: true,
  })
  @ApiResponse({ status: 201, type: WebhookResponse })
  @ApiResponse({ status: 401, description: 'Invalid webhook hash' })
  @ApiResponse({ status: 503, description: 'Webhooks are not configured' })
  async webhook(
    @Headers('verif-hash') verifHash: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    return {
      result: await this.paymentsService.handleWebhook(
        verifHash,
        payload as Parameters<PaymentsService['handleWebhook']>[1],
      ),
    };
  }

  @Post('webhooks/paystack')
  @ApiTags('Webhooks')
  @ApiOperation({
    summary: 'Paystack charge webhook',
    description:
      'Verifies the x-paystack-signature HMAC over the raw body, then verifies the transaction with Paystack, marks the order paid and issues tickets. Safe to retry.',
  })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'HMAC SHA512 of the raw body, signed with PAYSTACK_SECRET_KEY',
    required: true,
  })
  @ApiResponse({ status: 201, type: WebhookResponse })
  @ApiResponse({ status: 401, description: 'Invalid Paystack signature' })
  @ApiResponse({ status: 503, description: 'Webhooks are not configured' })
  async paystackWebhook(
    @Headers('x-paystack-signature') signature: string | undefined,
    @Req() request: { rawBody?: Buffer },
    @Body() payload: Record<string, unknown>,
  ) {
    return {
      result: await this.paymentsService.handlePaystackWebhook(
        signature,
        request.rawBody,
        payload as Parameters<PaymentsService['handlePaystackWebhook']>[2],
      ),
    };
  }
}
