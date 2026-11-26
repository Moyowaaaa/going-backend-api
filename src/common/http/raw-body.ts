import type { INestApplication } from '@nestjs/common';
import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';

type RawBodyRequest = IncomingMessage & { rawBody?: Buffer };

const PAYSTACK_WEBHOOK_PATH = '/webhooks/paystack';

function capturePaystackBody(
  req: IncomingMessage,
  _res: ServerResponse,
  buf: Buffer,
): void {
  const url = (req as { originalUrl?: string }).originalUrl ?? req.url ?? '';

  if (url.split('?')[0] === PAYSTACK_WEBHOOK_PATH) {
    (req as RawBodyRequest).rawBody = Buffer.from(buf);
  }
}

/**
 * Paystack signs the exact bytes it POSTs. Nest's default JSON parser throws
 * those bytes away, so capture them before parsing for the webhook route only.
 */
export function configureRawBody(app: INestApplication): void {
  app.use(express.json({ verify: capturePaystackBody }));
  app.use(express.urlencoded({ extended: true, verify: capturePaystackBody }));
}
