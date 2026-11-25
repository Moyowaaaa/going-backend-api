import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureRawBody } from '../src/common/http/raw-body.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TransformInterceptor } from '../src/utils/transform.interceptor.js';

/**
 * Manual, opt-in check against the real Paystack test API. Run with:
 * npx vitest run --config ./vitest.config.manual.ts
 */
describe('Paystack live API (manual)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const organizerEmail = `live-organizer-${suffix}@example.com`;
  const buyerEmail = `live-buyer-${suffix}@example.com`;
  const password = 'test-password-123';

  let organizerId: string | undefined;
  let buyerId: string | undefined;
  let eventId: string | undefined;
  let ticketTypeId: string | undefined;
  let orderId: string | undefined;

  const originalProvider = process.env.PAYMENT_PROVIDER;

  beforeAll(async () => {
    process.env.PAYMENT_PROVIDER = 'paystack';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<App>({ bodyParser: false });
    configureRawBody(app);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (orderId) {
      await prisma.ticket.deleteMany({ where: { orderItem: { orderId } } });
      await prisma.payment.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
    }
    if (ticketTypeId) {
      await prisma.ticketType.delete({ where: { id: ticketTypeId } });
    }
    if (eventId) {
      await prisma.event.delete({ where: { id: eventId } });
    }
    if (organizerId || buyerId) {
      await prisma.user.deleteMany({
        where: { id: { in: [organizerId, buyerId].filter(Boolean) as string[] } },
      });
    }

    await app?.close();

    if (originalProvider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = originalProvider;
  });

  const data = (response: request.Response) => response.body.data;

  it('initializes a real Paystack checkout and verifies a signed webhook', async () => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    expect(secret?.startsWith('sk_test_')).toBe(true);

    const register = async (email: string) => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          firstName: 'Live',
          lastName: 'Check',
          password,
        })
        .expect(201);
      return data(response).id as string;
    };

    const login = async (email: string) => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(201);
      return data(response).accessToken as string;
    };

    organizerId = await register(organizerEmail);
    buyerId = await register(buyerEmail);
    const organizerToken = await login(organizerEmail);
    const buyerToken = await login(buyerEmail);

    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);

    const eventResponse = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: `Paystack live check ${suffix}`,
        description: 'An event created solely for the manual Paystack check.',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      })
      .expect(201);
    eventId = data(eventResponse).id;

    await request(app.getHttpServer())
      .post(`/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send()
      .expect(201);

    const ticketResponse = await request(app.getHttpServer())
      .post(`/events/${eventId}/tickets`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        name: 'General Admission',
        price: 50000,
        quantity: 2,
        currency: 'NGN',
      })
      .expect(201);
    ticketTypeId = data(ticketResponse).id;

    await request(app.getHttpServer())
      .post(`/events/${eventId}/tickets/${ticketTypeId}/publish`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send()
      .expect(201);

    const orderResponse = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ items: [{ ticketTypeId, quantity: 1 }] })
      .expect(201);
    orderId = data(orderResponse).id;

    const payResponse = await request(app.getHttpServer())
      .post(`/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send();

    if (payResponse.status !== 201) {
      console.log('PAY_INIT_FAILED', payResponse.status, payResponse.body);
    }
    expect(payResponse.status).toBe(201);

    const payment = data(payResponse);
    console.log('PAY_INIT_OK', {
      reference: payment.reference,
      amount: payment.amount,
      checkoutHost: new URL(payment.checkoutUrl).host,
    });
    expect(payment.checkoutUrl).toMatch(/^https:\/\/[^/]*paystack\.com\//);
    expect(payment.amount).toBe(50000);

    const payload = {
      event: 'charge.success',
      data: {
        id: 123456789,
        reference: payment.reference,
        status: 'success',
        amount: 50000,
        currency: 'NGN',
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = createHmac('sha512', secret!)
      .update(rawBody)
      .digest('hex');

    await request(app.getHttpServer())
      .post('/webhooks/paystack')
      .set('x-paystack-signature', 'wrong-signature')
      .send(payload)
      .expect(401);

    const webhook = await request(app.getHttpServer())
      .post('/webhooks/paystack')
      .set('x-paystack-signature', signature)
      .send(payload)
      .expect(201);
    console.log('WEBHOOK_RESULT', data(webhook).result);

    const storedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.paymentId },
    });
    console.log('PAYMENT_STATUS', storedPayment.status);
    expect(['FAILED', 'SUCCESSFUL']).toContain(storedPayment.status);
  });
});
