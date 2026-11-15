import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

describe('OpenAPI document', () => {
  it('documents success envelopes and sample responses', async () => {
    process.env.JWT_SECRET ??= 'swagger-documentation-spec';

    const [
      { AppController },
      { AppService },
      { AuthController },
      { AuthService },
      { EventCategoryController },
      { EventsController },
      { EventsService },
      { EventsTicketsController },
      { TicketsController },
      { TicketsService },
    ] = await Promise.all([
      import('../../app.controller.js'),
      import('../../app.service.js'),
      import('../../auth/auth.controller.js'),
      import('../../auth/auth.service.js'),
      import('../../event-category/event-category.controller.js'),
      import('../../events/events.controller.js'),
      import('../../events/events.service.js'),
      import('../../tickets/events-tickets/events-tickets.controller.js'),
      import('../../tickets/tickets.controller.js'),
      import('../../tickets/tickets.service.js'),
    ]);

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AppController,
        AuthController,
        EventCategoryController,
        EventsController,
        TicketsController,
        EventsTicketsController,
      ],
      providers: [
        AppService,
        { provide: AuthService, useValue: {} },
        { provide: EventsService, useValue: {} },
        { provide: TicketsService, useValue: {} },
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Going API')
        .setVersion('0.0.1')
        .addBearerAuth()
        .build(),
    );

    const register = document.paths['/auth/register'].post;
    const created = register.responses['201'].content['application/json'];
    expect(created.example).toMatchObject({
      statusCode: 201,
      message: 'Success',
      data: { email: 'ada@going.example', firstName: 'Ada' },
    });

    const login = document.paths['/auth/login'].post;
    expect(
      login.responses['201'].content['application/json'].example.data,
    ).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    expect(
      login.responses['401'].content['application/json'].examples.wrongPassword
        .value.message,
    ).toBe('Invalid email or password');

    const me = document.paths['/auth/me'].get;
    expect(me.security).toEqual([{ bearer: [] }]);
    expect(me.responses['200'].content['application/json'].example.data).toEqual({
      id: '3c1e9a20-7b44-4f1a-9c2d-11aa22bb33cc',
      email: 'ada@going.example',
    });

    const events = document.paths['/events'].get;
    expect(
      events.responses['200'].content['application/json'].example.data[0].slug,
    ).toBe('lagos-jazz-night-2026-11-20');

    const deleted = document.paths['/events/{id}'].delete;
    expect(
      deleted.responses['200'].content['application/json'].example.data,
    ).toBe('Event successfully deleted');

    const categories = document.paths['/event-category/categories'].get;
    expect(
      categories.responses['200'].content['application/json'].example.data,
    ).toContain('MUSIC');

    await app.close();
  });
});
