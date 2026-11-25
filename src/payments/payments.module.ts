import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FlutterwaveClient } from './flutterwave.client.js';
import { PaystackClient } from './paystack.client.js';
import { MockPaymentProviderClient } from './mock-payment-provider.client.js';
import { PaymentProviderClient } from './payment-provider.client.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PaymentProviderClient,
      useFactory: () =>
        process.env.PAYMENT_PROVIDER === 'mock'
          ? new MockPaymentProviderClient()
          : process.env.PAYMENT_PROVIDER === 'flutterwave'
          ? new FlutterwaveClient()
          : new PaystackClient(),
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
