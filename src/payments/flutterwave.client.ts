import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PaymentProvider } from '../generated/prisma/enums.js';
import {
  InitializePaymentInput,
  InitializedPayment,
  PaymentProviderClient,
  VerifiedPayment,
} from './payment-provider.client.js';

type FlutterwaveResponse<T> = {
  status: string;
  message?: string;
  data: T;
};

type ChargeData = { link: string; tx_ref: string };
type TransactionData = {
  id: number;
  tx_ref: string;
  status: string;
  amount: number;
  currency: string;
};

/** Real Flutterwave v3 client. Uses fetch, so no extra dependency. */
@Injectable()
export class FlutterwaveClient extends PaymentProviderClient {
  readonly provider = PaymentProvider.FLUTTERWAVE;

  private readonly logger = new Logger(FlutterwaveClient.name);

  private get secretKey(): string | undefined {
    return process.env.FLUTTERWAVE_SECRET_KEY;
  }

  private get baseUrl(): string {
    return (
      process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3'
    ).replace(/\/+$/, '');
  }

  private assertConfigured(): string {
    if (!this.secretKey) {
      throw new ServiceUnavailableException(
        'Payments are not configured: FLUTTERWAVE_SECRET_KEY is missing',
      );
    }
    return this.secretKey;
  }

  async initialize(input: InitializePaymentInput): Promise<InitializedPayment> {
    const secretKey = this.assertConfigured();

    const response = await this.request<ChargeData>('/charges', {
      method: 'POST',
      body: {
        tx_ref: input.reference,
        // Our prices are stored in minor units (kobo); Flutterwave expects
        // major units (naira).
        amount: input.amount / 100,
        currency: input.currency,
        email: input.email,
        redirect_url: input.redirectUrl,
        customization: {
          title: 'Going event tickets',
          description: `Order ${input.orderReference}`,
        },
        meta: { orderReference: input.orderReference },
      },
      secretKey,
    });

    if (!response.data?.link) {
      throw new ServiceUnavailableException(
        'Flutterwave did not return a checkout link',
      );
    }

    return { checkoutUrl: response.data.link, reference: input.reference };
  }

  async verify(transactionId: string): Promise<VerifiedPayment> {
    const secretKey = this.assertConfigured();

    const response = await this.request<TransactionData>(
      `/transactions/${encodeURIComponent(transactionId)}/verify`,
      { method: 'GET', secretKey },
    );

    const data = response.data;

    return {
      successful: data.status?.toLowerCase() === 'successful',
      reference: data.tx_ref,
      amount: Math.round(Number(data.amount) * 100),
      currency: data.currency,
      transactionId: String(data.id),
    };
  }

  private async request<T>(
    path: string,
    options: { method: 'GET' | 'POST'; body?: unknown; secretKey: string },
  ): Promise<FlutterwaveResponse<T>> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${options.secretKey}`,
          'Content-Type': 'application/json',
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
    } catch (error) {
      this.logger.error(`Flutterwave ${path} failed: ${String(error)}`);
      throw new ServiceUnavailableException('Payment provider unavailable');
    }

    const payload = (await response.json().catch(() => null)) as
      | FlutterwaveResponse<T>
      | null;

    if (!response.ok || payload?.status !== 'success') {
      this.logger.warn(
        `Flutterwave ${path} returned ${response.status}: ${payload?.message ?? 'unknown error'}`,
      );
      throw new ServiceUnavailableException(
        'Payment provider rejected the request',
      );
    }

    return payload;
  }
}
