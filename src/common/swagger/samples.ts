export const samples = {
  userId: '3c1e9a20-7b44-4f1a-9c2d-11aa22bb33cc',
  eventId: '8f1c2b3a-4d5e-4f70-8192-a3b4c5d6e7f8',
  venueId: 'b7e1d4c2-9a30-4c55-8e11-0f2a6b8c9d10',
  ticketId: 'd4a8c1e2-6b33-4a19-9f70-12ab34cd56ef',
  email: 'ada@going.example',
  accessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYzFlOWEyMC03YjQ0LTRmMWEtOWMyZC0xMWFhMjJiYjMzY2MiLCJlbWFpbCI6ImFkYUBnb2luZy5leGFtcGxlIn0.example-signature',
  createdAt: '2026-11-15T14:30:00.000Z',
  updatedAt: '2026-11-15T15:00:00.000Z',
  startDate: '2026-11-20T18:00:00.000Z',
  endDate: '2026-11-20T23:00:00.000Z',
} as const;

export const registeredUserExample = {
  id: samples.userId,
  email: samples.email,
  firstName: 'Ada',
  lastName: 'Lovelace',
  isEmailVerified: false,
  createdAt: samples.createdAt,
};

export const publicUserExample = {
  id: samples.userId,
  email: samples.email,
  firstName: 'Ada',
  lastName: 'Lovelace',
  isEmailVerified: false,
};

export const loginExample = {
  message: 'Login successful',
  accessToken: samples.accessToken,
  tokenType: 'Bearer',
  expiresIn: 900,
  user: publicUserExample,
};

export const profileExample = {
  id: samples.userId,
  email: samples.email,
};

export const eventExample = {
  id: samples.eventId,
  slug: 'lagos-jazz-night-2026-11-20',
  title: 'Lagos Jazz Night',
  description: 'An evening of live jazz on the Victoria Island waterfront.',
  accentColor: null,
  CoverImage: 'https://cdn.going.example/events/lagos-jazz-night.jpg',
  startDate: samples.startDate,
  endDate: samples.endDate,
  status: 'DRAFT',
  organizerId: samples.userId,
  locationType: 'PHYSICAL',
  venueId: null,
  categories: ['MUSIC'],
  createdAt: samples.createdAt,
  updatedAt: samples.createdAt,
};

export const publishedEventExample = {
  ...eventExample,
  status: 'PUBLISHED',
  updatedAt: samples.updatedAt,
};

export const updatedEventExample = {
  ...publishedEventExample,
  accentColor: '#1B4D3E',
  venueId: samples.venueId,
};

export const ticketExample = {
  id: samples.ticketId,
  name: 'General Admission',
  description: 'Standing access for the full evening.',
  price: 15000,
  currency: 'NGN',
  quantity: 200,
  sold: 0,
  salesStart: '2026-11-15T00:00:00.000Z',
  salesEnd: '2026-11-20T17:00:00.000Z',
  eventId: samples.eventId,
  status: 'DRAFT',
  createdAt: samples.createdAt,
  updatedAt: samples.createdAt,
};

export const publishedTicketExample = {
  ...ticketExample,
  status: 'PUBLISHED',
};
