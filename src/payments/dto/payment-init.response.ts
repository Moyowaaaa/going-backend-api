import { ApiProperty } from '@nestjs/swagger';

export class PaymentInitResponse {
  @ApiProperty({ format: 'uuid' })
  paymentId: string;

  @ApiProperty({
    description:
    'The reference sent to the provider. Webhooks echo it back (Paystack: reference, Flutterwave: tx_ref).',
    example: '0f8e7d6c-5b4a-4321-9876-543210fedcba',
  })
  reference: string;

  @ApiProperty({
    description: 'Send the buyer here to complete payment.',
    example: 'https://checkout.paystack.com/example',
  })
  checkoutUrl: string;

  @ApiProperty({ description: 'Amount in minor units.', example: 30000 })
  amount: number;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiProperty({
    format: 'date-time',
    description: 'The reservation is released if payment has not cleared by then.',
  })
  orderExpiresAt: string;
}

export class WebhookResponse {
  @ApiProperty({
    description:
      'What the webhook did. Duplicate and ignored events are acknowledged with 200 so the provider stops retrying.',
    example: { processed: true },
  })
  result: Record<string, boolean | string>;
}
