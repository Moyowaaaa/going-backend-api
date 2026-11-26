import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/utils/transform.interceptor.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { configureRawBody } from '../src/common/http/raw-body.js';

/**
 * Drives the whole mock payment flow over HTTP against the real database:
 * register → event/ticket → order → pay → webhook → tickets → check-in.
 */
describe('Mock payment flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const organizerEmail = `organizer-${suffix}@example.test`;
  const buyerEmail = `buyer-${suffix}@example.test`;
  const password = 'test-password-123';
  const paystackSecret = 'e2e-paystack-secret';

  let organizerId: string | undefined;
  let buyerId: string | undefined;
  let eventId: string | undefined;
  let ticketTypeId: string | undefined;
  let orderId: string | undefined;

  const originalProvider = process.env.PAYMENT_PROVIDER;
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;

  beforeAll(async () => {
    process.env.PAYMENT_PROVIDER = 'mock';
    process.env.PAYSTACK_SECRET_KEY = paystackSecret;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
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
      await prisma.ticket.deleteMany({
        where: { orderItem: { orderId } },
      });
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
        where: {
          id: { in: [organizerId, buyerId].filter(Boolean) as string[] },
        },
      });
    }

    await app?.close();

    if (originalProvider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = originalProvider;
    if (originalSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = originalSecret;
  });

  const register = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        firstName: 'E2E',
        lastName: 'Test',
        password,
      })
      .expect(201);

    return response.body.data.id as string;
  };

  const login = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body.data.accessToken as string;
  };

  const data = (response: request.Response) => response.body.data;

  it('pays an order, issues tickets and checks them in', async () => {
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
        title: `Mock payment e2e ${suffix}`,
        description: 'An event created solely for the mock payment e2e test.',
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
        price: 150000,
        quantity: 3,
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
      .send({ items: [{ ticketTypeId, quantity: 2 }] })
      .expect(201);
    orderId = data(orderResponse).id;

    expect(data(orderResponse)).toMatchObject({
      status: 'PENDING',
      total: 300000,
      currency: 'NGN',
    });

    const reserved = await prisma.ticketType.findUniqueOrThrow({
      where: { id: ticketTypeId },
    });
    expect(reserved).toMatchObject({ sold: 0, reserved: 2 });

    const payResponse = await request(app.getHttpServer())
      .post(`/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send()
      .expect(201);
    const payment = data(payResponse);

    expect(payment).toMatchObject({ amount: 300000, currency: 'NGN' });
    expect(payment.checkoutUrl).toContain(`/mock-checkout/${payment.reference}`);

    const payload = {
      event: 'charge.success',
      data: {
        id: 123456789,
        reference: payment.reference,
        status: 'success',
        amount: 300000,
        currency: 'NGN',
      },
    };
    const signature = createHmac('sha512', paystackSecret)
      .update(JSON.stringify(payload))
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
    expect(data(webhook)).toEqual({ result: { processed: true } });

    const duplicate = await request(app.getHttpServer())
      .post('/webhooks/paystack')
      .set('x-paystack-signature', signature)
      .send(payload)
      .expect(201);
    expect(data(duplicate)).toEqual({ result: { duplicate: true } });

    const paidOrder = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(data(paidOrder)).toMatchObject({
      status: 'PAID',
      payments: [{ status: 'SUCCESSFUL', providerReference: payment.reference }],
    });

    const sold = await prisma.ticketType.findUniqueOrThrow({
      where: { id: ticketTypeId },
    });
    expect(sold).toMatchObject({ sold: 2, reserved: 0 });

    const ticketsResponse = await request(app.getHttpServer())
      .get('/my-tickets')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    const tickets = data(ticketsResponse) as Array<{
      id: string;
      ticketNumber: string;
      qrToken: string;
      status: string;
    }>;

    expect(tickets).toHaveLength(2);
    expect(tickets.every((ticket) => ticket.status === 'VALID')).toBe(true);
    expect(new Set(tickets.map((ticket) => ticket.qrToken)).size).toBe(2);

    const checkedIn = await request(app.getHttpServer())
      .post('/check-in')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ qrToken: tickets[0].qrToken })
      .expect(201);
    expect(data(checkedIn)).toMatchObject({
      id: tickets[0].id,
      status: 'USED',
    });

    await request(app.getHttpServer())
      .post('/check-in')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ qrToken: tickets[0].qrToken })
      .expect(409);

    await request(app.getHttpServer())
      .post('/check-in')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ qrToken: tickets[1].qrToken })
      .expect(403);
  });
});
