import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '../generated/prisma/enums.js';
import {
  InitializePaymentInput,
  InitializedPayment,
  PaymentProviderClient,
  VerifiedPayment,
} from './payment-provider.client.js';

type MockTransaction = { amount: number; currency: string; reference: string };

/**
 * Local-development provider. Set PAYMENT_PROVIDER=mock to exercise the whole
 * order → pay → webhook → ticket flow without provider keys.
 * Never select this in production.
 */
@Injectable()
export class MockPaymentProviderClient extends PaymentProviderClient {
  readonly provider = PaymentProvider.PAYSTACK;

  private readonly transactions = new Map<string, MockTransaction>();

  async initialize(input: InitializePaymentInput): Promise<InitializedPayment> {
    this.transactions.set(input.reference, {
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
    });

    const base = (
      process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`
    ).replace(/\/+$/, '');

    return {
      checkoutUrl: `${base}/mock-checkout/${input.reference}`,
      reference: input.reference,
    };
  }

  async verify(transactionId: string): Promise<VerifiedPayment> {
    const transaction = this.transactions.get(transactionId);

    return {
      successful: Boolean(transaction),
      reference: transaction?.reference ?? transactionId,
      amount: transaction?.amount ?? 0,
      currency: transaction?.currency ?? '',
      transactionId,
    };
  }
}
