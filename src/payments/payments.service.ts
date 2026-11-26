import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentProviderClient } from './payment-provider.client.js';
import { assertPaystackSignature } from './paystack.client.js';

type FlutterwaveWebhookPayload = {
  event?: string;
  data?: {
    id?: number | string;
    tx_ref?: string;
    status?: string;
    amount?: number;
    currency?: string;
  };
};

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    id?: number | string;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
  };
};

type PaymentEvent = {
  paymentReference: string;
  transactionId: string;
  amount: number;
  currency: string;
  metadata: Prisma.InputJsonValue;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: PaymentProviderClient,
  ) {}

  /** Create a payment and return the provider's checkout URL. */
  async initialize(userId: string, orderId: string, returnUrl?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { user: { select: { email: true } } },
    });

    if (!order) throw new NotFoundException('Order not found.');

    if (order.status !== 'PENDING') {
      throw new BadRequestException('This order can no longer be paid for.');
    }

    if (order.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('This order has expired.');
    }

    const reference = randomUUID();

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: this.provider.provider,
        providerReference: reference,
        status: 'PENDING',
        amount: order.total,
        currency: order.currency,
      },
      select: { id: true, providerReference: true },
    });

    const redirectUrl = this.redirectUrl(order.reference, returnUrl);

    let checkoutUrl: string;
    try {
      const initialized = await this.provider.initialize({
        reference: payment.providerReference,
        amount: order.total,
        currency: order.currency,
        email: order.user.email,
        redirectUrl,
        orderReference: order.reference,
      });
      checkoutUrl = initialized.checkoutUrl;
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }

    return {
      paymentId: payment.id,
      reference: payment.providerReference,
      checkoutUrl,
      amount: order.total,
      currency: order.currency,
      orderExpiresAt: order.expiresAt,
    };
  }

  /**
   * Flutterwave callback. The hash header is checked before anything else,
   * and the transaction is verified server-side, not trusted from the body.
   * Repeated calls for the same payment are harmless.
   */
  async handleWebhook(
    verifHash: string | undefined,
    payload: FlutterwaveWebhookPayload,
  ) {
    this.assertWebhookHash(verifHash);

    if (payload.event !== 'charge.completed' || !payload.data) {
      return { ignored: 'event' };
    }

    const data = payload.data;

    if (data.status?.toLowerCase() !== 'successful' || !data.tx_ref) {
      return { ignored: 'status' };
    }

    return this.fulfillPayment({
      paymentReference: data.tx_ref,
      transactionId: data.id ? String(data.id) : '',
      amount: Number(data.amount),
      currency: data.currency ?? '',
      metadata: payload as unknown as Prisma.InputJsonValue,
    });
  }

  /**
   * Paystack callback. The HMAC signature covers the raw request body, so it
   * is checked before the parsed payload is used. Paystack verifies by
   * reference, and its amounts are already in minor units (kobo).
   */
  async handlePaystackWebhook(
    signature: string | undefined,
    rawBody: Buffer | undefined,
    payload: PaystackWebhookPayload,
  ) {
    assertPaystackSignature(rawBody, signature);

    if (payload.event !== 'charge.success' || !payload.data) {
      return { ignored: 'event' };
    }

    const data = payload.data;

    if (data.status?.toLowerCase() !== 'success' || !data.reference) {
      return { ignored: 'status' };
    }

    return this.fulfillPayment({
      paymentReference: data.reference,
      transactionId: data.reference,
      amount: Number(data.amount),
      currency: data.currency ?? '',
      metadata: payload as unknown as Prisma.InputJsonValue,
    });
  }

  private async fulfillPayment(event: PaymentEvent) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerReference: event.paymentReference },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      this.logger.warn(
        `Webhook for unknown reference ${event.paymentReference}`,
      );
      return { ignored: 'unknown-reference' };
    }

    if (payment.status !== 'PENDING') {
      return { duplicate: true };
    }

    if (!event.transactionId) {
      return { ignored: 'no-transaction-id' };
    }

    const verified = await this.provider.verify(event.transactionId);

    if (
      !verified.successful ||
      verified.reference !== payment.providerReference ||
      verified.amount !== event.amount ||
      verified.currency !== event.currency
    ) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return { ignored: 'verification-failed' };
    }

    if (payment.order.status !== 'PENDING') {
      // The reservation lapsed before payment cleared; fulfilling it now
      // would oversell. This needs a manual refund.
      this.logger.error(
        `Paid order ${payment.order.reference} is ${payment.order.status}; manual refund required`,
      );
      return { ignored: 'order-not-pending' };
    }

    await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: {
            status: 'SUCCESSFUL',
            paidAt: new Date(),
            metadata: event.metadata,
          },
        });

        if (claimed.count === 0) return;

        await tx.order.updateMany({
          where: { id: payment.orderId, status: 'PENDING' },
          data: { status: 'PAID' },
        });

        for (const item of payment.order.items) {
          const sold = await tx.$queryRaw<{ id: string }[]>`
            UPDATE "TicketType"
            SET "sold" = "sold" + ${item.quantity},
                "reserved" = "reserved" - ${item.quantity}
            WHERE "id" = ${item.ticketTypeId}
              AND "reserved" >= ${item.quantity}
            RETURNING "id"
          `;

          if (sold.length === 0) {
            throw new Error(
              `Could not confirm inventory for ticket type ${item.ticketTypeId}`,
            );
          }
        }

        const tickets = payment.order.items.flatMap((item) =>
          Array.from({ length: item.quantity }, (_, index) => ({
            orderItemId: item.id,
            ticketNumber: `GO-${randomUUID().slice(0, 8).toUpperCase()}-${index + 1}`,
            qrToken: randomBytes(32).toString('hex'),
          })),
        );

        await tx.ticket.createMany({ data: tickets });
      },
      { isolationLevel: 'Serializable' },
    );

    return { processed: true };
  }

  private redirectUrl(orderReference: string, requestedUrl?: string): string {
    const candidate = requestedUrl?.trim();

if (candidate) {
try {
const parsed = new URL(candidate);
if (!parsed.protocol || !parsed.host) throw new Error('invalid');
} catch {
throw new BadRequestException('returnUrl must be a valid URL');
}
}

const base = (
      process.env.PUBLIC_BASE_URL ??
      `http://localhost:${process.env.PORT ?? 4000}`
    ).replace(/\/+$/, '');

    const target = candidate ||
      process.env.PAYMENT_REDIRECT_URL ||
 process.env.FLUTTERWAVE_REDIRECT_URL ||
      `${base}/payment/return`;

const separator = target.includes('?') ? '&' : '?';
return `${target}${separator}order=${encodeURIComponent(orderReference)}`;
  }

  private assertWebhookHash(provided: string | undefined): void {
    const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;

    if (!expected) {
      throw new ServiceUnavailableException(
        'Webhooks are not configured: FLUTTERWAVE_WEBHOOK_HASH is missing',
      );
    }

    const actualBuffer = Buffer.from(provided ?? '');
    const expectedBuffer = Buffer.from(expected);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid webhook hash');
    }
  }
}
