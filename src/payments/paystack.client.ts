import {
 BadRequestException,
 Injectable,
 Logger,
 ServiceUnavailableException,
 UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentProvider } from '../generated/prisma/enums.js';
import {
 InitializePaymentInput,
 InitializedPayment,
 PaymentProviderClient,
 VerifiedPayment,
} from './payment-provider.client.js';

type PaystackResponse<T> = {
  status: boolean;
  message?: string;
  data: T;
};

type ChargeData = { authorization_url: string; reference: string };
type TransactionData = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
};

/** Real Paystack v1 client. Uses fetch, so no extra dependency. */
@Injectable()
export class PaystackClient extends PaymentProviderClient {
  readonly provider = PaymentProvider.PAYSTACK;

  private readonly logger = new Logger(PaystackClient.name);

  private get secretKey(): string | undefined {
    return process.env.PAYSTACK_SECRET_KEY;
  }

  private get baseUrl(): string {
    return (process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co').replace(
      /\/+$/,
      '',
    );
  }

  private assertConfigured(): string {
    if (!this.secretKey) {
      throw new ServiceUnavailableException(
        'Payments are not configured: PAYSTACK_SECRET_KEY is missing',
      );
    }
    return this.secretKey;
  }

  async initialize(input: InitializePaymentInput): Promise<InitializedPayment> {
    const secretKey = this.assertConfigured();

    const response = await this.request<ChargeData>('/transaction/initialize', {
      method: 'POST',
      secretKey,
      // Prices are already stored in minor units (kobo), which is what
      // Paystack expects. Do not divide by 100 here (unlike Flutterwave).
      body: {
        email: input.email,
        amount: input.amount,
        currency: input.currency,
        reference: input.reference,
        callback_url: input.redirectUrl,
        metadata: { orderReference: input.orderReference },
      },
    });

    if (!response.data?.authorization_url) {
      throw new ServiceUnavailableException(
        'Paystack did not return a checkout URL',
      );
    }

    return {
      checkoutUrl: response.data.authorization_url,
      reference: response.data.reference || input.reference,
    };
  }

  async verify(reference: string): Promise<VerifiedPayment> {
    const secretKey = this.assertConfigured();

    const response = await this.request<TransactionData>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: 'GET', secretKey },
    );

    const data = response.data;

    return {
      successful: data.status?.toLowerCase() === 'success',
      reference: data.reference,
      amount: Number(data.amount),
      currency: data.currency,
      transactionId: String(data.id ?? data.reference),
    };
  }

  private async request<T>(
    path: string,
    options: { method: 'GET' | 'POST'; body?: unknown; secretKey: string },
  ): Promise<PaystackResponse<T>> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${options.secretKey}`,
          'Content-Type': 'application/json',
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      this.logger.error(`Paystack ${path} failed: ${String(error)}`);
      throw new ServiceUnavailableException('Payment provider unavailable');
    }

    const payload = (await response.json().catch(() => null)) as
      | PaystackResponse<T>
      | null;

    if (!response.ok || !payload?.status) {
      this.logger.warn(
        `Paystack ${path} returned ${response.status}: ${payload?.message ?? 'unknown error'}`,
      );
      throw new ServiceUnavailableException(
        'Payment provider rejected the request',
      );
    }

    return payload;
  }
}

/**
 * Paystack signs the exact bytes of the webhook body with the secret key.
 * The body must be captured before JSON parsing (see configureRawBody).
 */
export function assertPaystackSignature(
  rawBody: Buffer | undefined,
  signature: string | undefined,
): void {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new ServiceUnavailableException(
      'Webhooks are not configured: PAYSTACK_SECRET_KEY is missing',
    );
  }

  if (!rawBody) {
    throw new BadRequestException('Missing raw webhook body');
  }

  const expected = Buffer.from(
    createHmac('sha512', secretKey).update(rawBody).digest('hex'),
  );
  const provided = Buffer.from(signature ?? '');

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    throw new UnauthorizedException('Invalid Paystack signature');
  }
}
