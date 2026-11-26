import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  assertPaystackSignature,
  PaystackClient,
} from './paystack.client.js';

describe('PaystackClient', () => {
  const secret = 'paystack-secret';
  const client = new PaystackClient();
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = secret;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends kobo amounts unchanged and returns the checkout URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/test',
          reference: 'ref-1',
        },
      }),
    });

    const result = await client.initialize({
      reference: 'ref-1',
      amount: 30000,
      currency: 'NGN',
      email: 'buyer@example.com',
      redirectUrl: 'https://api.example/payment/return',
      orderReference: 'ORD-1',
    });

    expect(result).toEqual({
      checkoutUrl: 'https://checkout.paystack.com/test',
      reference: 'ref-1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.paystack.co/transaction/initialize',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"amount":30000'),
      }),
    );
  });

  it('verifies a transaction by reference', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        data: {
          id: 42,
          status: 'success',
          reference: 'ref-1',
          amount: 30000,
          currency: 'NGN',
        },
      }),
    });

    await expect(client.verify('ref-1')).resolves.toEqual({
      successful: true,
      reference: 'ref-1',
      amount: 30000,
      currency: 'NGN',
      transactionId: '42',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.paystack.co/transaction/verify/ref-1',
    );
  });

  it('accepts a valid webhook signature and rejects a wrong one', () => {
    const rawBody = Buffer.from('{"event":"charge.success"}');
    const signature = createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    expect(() => assertPaystackSignature(rawBody, signature)).not.toThrow();
    expect(() => assertPaystackSignature(rawBody, 'wrong')).toThrow(
      UnauthorizedException,
    );
  });
});
