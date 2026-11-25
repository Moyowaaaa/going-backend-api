import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentProvider } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentProviderClient } from './payment-provider.client.js';
import { PaymentsService } from './payments.service.js';

const reference = '11111111-2222-4333-8444-555555555555';
const orderId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function makePrisma(orderStatus = 'PENDING') {
  const order = {
    id: orderId,
    reference: 'ORD-1',
    status: orderStatus,
    total: 30000,
    currency: 'NGN',
    expiresAt: new Date(Date.now() + 60_000),
    user: { email: 'buyer@example.com' },
    items: [
      {
        id: 'item-1',
        ticketTypeId: 'type-1',
        quantity: 2,
      },
    ],
  };

  const payment = {
    id: 'payment-1',
    providerReference: reference,
    status: 'PENDING',
    amount: 30000,
    currency: 'NGN',
    orderId,
    order,
  };

  const tx = {
    payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    ticket: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    $queryRaw: vi.fn().mockResolvedValue([{ id: 'type-1' }]),
  };

  const prisma = {
    order: { findFirst: vi.fn().mockResolvedValue(order) },
    payment: {
      create: vi.fn().mockResolvedValue({ id: 'payment-1', providerReference: reference }),
      findUnique: vi.fn().mockResolvedValue(payment),
      update: vi.fn().mockResolvedValue(payment),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    ticket: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };

  return { prisma, tx, payment };
}

const payload = {
  event: 'charge.completed',
  data: {
    id: 987654,
    tx_ref: reference,
    status: 'successful',
    amount: 30000,
    currency: 'NGN',
  },
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof makePrisma>['prisma'];
  let tx: ReturnType<typeof makePrisma>['tx'];
  let provider: {
    initialize: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    process.env.FLUTTERWAVE_WEBHOOK_HASH = 'test-hash';
    process.env.PAYSTACK_SECRET_KEY = 'paystack-test-secret';

    const made = makePrisma();
    prisma = made.prisma;
    tx = made.tx;
    provider = {
      provider: PaymentProvider.PAYSTACK,
      initialize: vi.fn().mockResolvedValue({
        checkoutUrl: 'https://checkout.example/pay',
        reference,
      }),
      verify: vi.fn().mockResolvedValue({
        successful: true,
        reference,
        amount: 30000,
        currency: 'NGN',
        transactionId: '987654',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentProviderClient, useValue: provider },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('initializes a payment with the hosted checkout URL', async () => {
    const result = await service.initialize('user-1', orderId);

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: PaymentProvider.PAYSTACK }),
      }),
    );
    expect(result.checkoutUrl).toBe('https://checkout.example/pay');
    expect(result.reference).toBe(reference);
  });

  it('rejects a webhook with the wrong hash', async () => {
    await expect(service.handleWebhook('wrong', payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(provider.verify).not.toHaveBeenCalled();
  });

  it('marks the order paid, converts the reservation and issues tickets', async () => {
    await expect(service.handleWebhook('test-hash', payload)).resolves.toEqual({
      processed: true,
    });

    expect(provider.verify).toHaveBeenCalledWith('987654');
    expect(tx.payment.updateMany).toHaveBeenCalled();
    expect(tx.order.updateMany).toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.ticket.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ orderItemId: 'item-1' }),
      ]),
    });
  });

  it('marks the payment failed when provider verification fails', async () => {
    provider.verify.mockResolvedValue({
      successful: false,
      reference,
      amount: 30000,
      currency: 'NGN',
      transactionId: '987654',
    });

    await expect(service.handleWebhook('test-hash', payload)).resolves.toEqual({
      ignored: 'verification-failed',
    });
    expect(prisma.payment.update).toHaveBeenCalled();
    expect(tx.ticket.createMany).not.toHaveBeenCalled();
  });

  it('does not issue tickets for an order that is no longer pending', async () => {
    prisma.payment.findUnique.mockResolvedValue(makePrisma('EXPIRED').payment);

    await expect(service.handleWebhook('test-hash', payload)).resolves.toEqual({
      ignored: 'order-not-pending',
    });
    expect(tx.ticket.createMany).not.toHaveBeenCalled();
  });

  describe('Paystack webhook', () => {
    const paystackPayload = {
      event: 'charge.success',
      data: {
        id: 123456789,
        reference,
        status: 'success',
        amount: 30000,
        currency: 'NGN',
      },
    };
    const rawBody = Buffer.from(JSON.stringify(paystackPayload));
    const signature = createHmac('sha512', 'paystack-test-secret')
      .update(rawBody)
      .digest('hex');

    it('rejects an invalid signature before verifying the transaction', async () => {
      await expect(
        service.handlePaystackWebhook('wrong', rawBody, paystackPayload),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(provider.verify).not.toHaveBeenCalled();
    });

    it('verifies by reference and issues tickets', async () => {
      await expect(
        service.handlePaystackWebhook(signature, rawBody, paystackPayload),
      ).resolves.toEqual({ processed: true });

      expect(provider.verify).toHaveBeenCalledWith(reference);
      expect(tx.payment.updateMany).toHaveBeenCalled();
      expect(tx.ticket.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ orderItemId: 'item-1' }),
        ]),
      });
    });

    it('ignores events other than a successful charge', async () => {
      await expect(
        service.handlePaystackWebhook(signature, rawBody, {
          ...paystackPayload,
          event: 'charge.failed',
        }),
      ).resolves.toEqual({ ignored: 'event' });
      expect(provider.verify).not.toHaveBeenCalled();
    });
  });
});
