import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import { buildSwaggerConfig } from './setup-swagger.js';

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
      { OrdersController },
      { OrdersService },
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
      import('../../orders/orders.controller.js'),
      import('../../orders/orders.service.js'),
    ]);

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AppController,
        AuthController,
        EventCategoryController,
        EventsController,
        TicketsController,
        EventsTicketsController,
        OrdersController,
      ],
      providers: [
        AppService,
        { provide: AuthService, useValue: {} },
        { provide: EventsService, useValue: {} },
        { provide: TicketsService, useValue: {} },
        { provide: OrdersService, useValue: {} },
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    const document = SwaggerModule.createDocument(app, buildSwaggerConfig());

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
    const eventsExample =
      events.responses['200'].content['application/json'].example.data;
    expect(eventsExample.data[0].slug).toBe('lagos-jazz-night-2026-11-20');
    expect(eventsExample.meta).toMatchObject({
      total: 125,
      page: 1,
      limit: 20,
      totalPages: 7,
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(events.security).toEqual([{ bearer: [] }]);
    expect(
      events.parameters.map((parameter: { name: string }) => parameter.name),
    ).toEqual(
      expect.arrayContaining(['page', 'limit', 'q', 'category']),
    );

    const mine = document.paths['/events/mine'].get;
    expect(mine.security).toEqual([{ bearer: [] }]);
    expect(
      mine.responses['200'].content['application/json'].example.data.meta,
    ).toBeDefined();

    const eventTickets = document.paths['/events/{eventId}/tickets'].get;
    expect(
      eventTickets.parameters.map(
        (parameter: { name: string }) => parameter.name,
      ),
    ).toEqual(expect.arrayContaining(['page', 'limit']));
    expect(
      eventTickets.responses['200'].content['application/json'].example.data
        .meta,
    ).toBeDefined();

    const deleted = document.paths['/events/{id}'].delete;
    expect(
      deleted.responses['200'].content['application/json'].example.data,
    ).toBe('Event successfully deleted');

    const eventPublish = document.paths['/events/{id}/publish'].post;
    expect(eventPublish.security).toEqual([{ bearer: [] }]);
    expect(
      eventPublish.responses['201'].content['application/json'].example.data
        .status,
    ).toBe('PUBLISHED');

    expect(document.paths['/tickets']?.get).toBeUndefined();
    expect(document.paths['/tickets/{ticketId}'].get.responses['404']).toBeDefined();
    const publish = document.paths['/events/{eventId}/tickets/{ticketId}/publish'].post;
    expect(publish.security).toEqual([{ bearer: [] }]);
    expect(publish.responses['201'].content['application/json'].example.data.status).toBe(
      'PUBLISHED',
    );
    expect(
      document.paths['/events/{eventId}/tickets/{ticketId}'].patch.security,
    ).toEqual([{ bearer: [] }]);
    expect(
      document.paths['/events/{eventId}/tickets/{ticketId}'].delete.responses['200']
        .content['application/json'].example.data,
    ).toBe('Ticket type successfully deleted');

    const categories = document.paths['/event-category/categories'].get;
    expect(
      categories.responses['200'].content['application/json'].example.data,
    ).toContain('MUSIC');

    const order = document.paths['/orders'].post;
    expect(order.security).toEqual([{ bearer: [] }]);
    expect(order.responses['201'].content['application/json'].example.data).toMatchObject({
      status: 'PENDING',
      total: 30000,
      currency: 'NGN',
    });
    expect(
      order.tags,
    ).toEqual(['Orders']);
    const orderErrors = order.responses['400'].content['application/json'];
    expect(
      Object.keys(orderErrors.examples),
    ).toEqual(
      expect.arrayContaining([
        'validation',
        'notPublished',
        'eventNotPublished',
        'eventEnded',
        'salesNotStarted',
        'salesEnded',
        'mixedCurrency',
      ]),
    );
    expect(
      order.responses['401'].content['application/json'].examples.missingHeader
        .value.message,
    ).toBe('Missing or invalid authorization header');
    expect(
      order.responses['409'].content['application/json'].example.message,
    ).toBe('One or more ticket types no longer have sufficient availability.');

    // TicketTypeResponse must document the reserved counter Orders relies on.
    const ticketSchema =
      document.components.schemas.TicketResponse ?? document.components.schemas.TicketResponseDto;
    expect(ticketSchema?.properties).toHaveProperty('reserved');
    expect(ticketSchema?.properties).toHaveProperty('sold');

    expect(document.info.description).toContain('offset-paginated');
    expect(
      document.tags.map((tag: { name: string }) => tag.name),
    ).toEqual(expect.arrayContaining(['Orders', 'Events', 'Tickets']));

    await app.close();
  });
});
