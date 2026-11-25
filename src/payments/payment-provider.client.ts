import { PaymentProvider } from '../generated/prisma/enums.js';

export interface InitializePaymentInput {
  /** Our own reference (Paystack reference / Flutterwave tx_ref). */
  reference: string;
  amount: number;
  currency: string;
  email: string;
  redirectUrl: string;
  orderReference: string;
}

export interface InitializedPayment {
  checkoutUrl: string;
  reference: string;
}

export interface VerifiedPayment {
  successful: boolean;
  reference: string;
  amount: number;
  currency: string;
  transactionId: string;
}

/** The one provider operation the payment flow depends on. */
export abstract class PaymentProviderClient {
  abstract readonly provider: PaymentProvider;

  abstract initialize(input: InitializePaymentInput): Promise<InitializedPayment>;

  abstract verify(transactionId: string): Promise<VerifiedPayment>;
}
