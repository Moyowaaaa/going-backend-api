import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const description = `
HTTP API for Going: accounts, events, and ticket types.

Every successful response is wrapped by the global interceptor:

\`\`\`json
{
  "statusCode": 200,
  "message": "Success",
  "data": {}
}
\`\`\`

\`data\` is the payload documented on each operation. \`statusCode\` matches the HTTP status. Validation and domain errors are not wrapped; they use Nest's exception body (\`statusCode\`, \`message\`, \`error\`).

Protected operations expect \`Authorization: Bearer <accessToken>\`. Tokens come from \`POST /auth/login\` and expire after 900 seconds.
`.trim();

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
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
    .addTag('Tickets', 'Ticket types, globally and under a single event.')
    .addTag('Event categories', 'The fixed set of categories an event can use.')
    .addTag('Health', 'Process liveness.')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
