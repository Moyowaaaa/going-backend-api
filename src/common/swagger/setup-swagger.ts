import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const description = `
HTTP API for Going: accounts, events, ticket types, orders, payments and tickets.

Every successful response is wrapped by the global interceptor:

\`\`\`json
{
  "statusCode": 200,
  "message": "Success",
  "data": {}
}
\`\`\`

\`data\` is the payload documented on each operation. \`statusCode\` matches the HTTP status. Validation and domain errors are not wrapped; they use Nest's exception body (\`statusCode\`, \`message\`, \`error\`).

Collection endpoints are offset-paginated with \`?page\` (from 1, default 1) and \`?limit\` (1 to 100, default 20). Their \`data\` is shaped as \`{ data: [], meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }\`, where \`total\` is counted under the same filters as the page.

Protected operations expect \`Authorization: Bearer <accessToken>\`. Tokens come from \`POST /auth/login\` and expire after 900 seconds. Use \`POST /auth/refresh\` with the refresh token to get a new pair; refresh tokens rotate on every use.

Some read operations accept a token optionally: anonymous callers see public data only, while the signed-in owner also sees their own drafts. When a token is sent on those operations it must be valid; an invalid one answers 401 rather than falling back to anonymous.

**Payment flow:** \`POST /orders\` reserves inventory for 15 minutes → \`POST /orders/:id/pay\` returns the provider checkout URL (Paystack by default) → the provider calls \`POST /webhooks/paystack\` with an \`x-paystack-signature\` HMAC over the raw body → the order becomes PAID and tickets are issued. Buyers read their tickets from \`GET /my-tickets\`; organizers scan them with \`POST /check-in\`. Prices are stored in minor units (kobo), which is what Paystack expects; Flutterwave, when selected, is charged in major units (naira).
`.trim();

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Going API')
    .setDescription(description)
    .setVersion('0.0.1')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'Access token from POST /auth/login. Send it as Authorization: Bearer <token>.',
    })
    .addTag('Auth', 'Registration, login, and the signed-in profile.')
    .addTag('Events', 'Browse events and manage the ones you organize.')
    .addTag('Tickets', 'Ticket types under a single event.')
    .addTag('Issued tickets', 'Tickets issued after payment and organizer check-in.')
    .addTag('Orders', 'Place an order and reserve ticket quantities.')
    .addTag(
  'Payments',
  'Start Paystack checkout and receive its webhook. Flutterwave remains available via PAYMENT_PROVIDER=flutterwave.',
)
    .addTag('Event categories', 'The fixed set of categories an event can use.')
    .addTag('Health', 'Process liveness.')
    .build();
}

export function setupSwagger(app: INestApplication) {
  const config = buildSwaggerConfig();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
