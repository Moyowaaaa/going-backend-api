export const samples = {
  userId: '3c1e9a20-7b44-4f1a-9c2d-11aa22bb33cc',
  eventId: '8f1c2b3a-4d5e-4f70-8192-a3b4c5d6e7f8',
  venueId: 'b7e1d4c2-9a30-4c55-8e11-0f2a6b8c9d10',
  ticketId: 'd4a8c1e2-6b33-4a19-9f70-12ab34cd56ef',
  email: 'ada@going.example',
  accessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYzFlOWEyMC03YjQ0LTRmMWEtOWMyZC0xMWFhMjJiYjMzY2MiLCJlbWFpbCI6ImFkYUBnb2luZy5leGFtcGxlIn0.example-signature',
  refreshToken:
    '9f2c41a7b6e84d3f0a5c11e9d7b2a8f4c6e0d3b1a9f7c5e2d8b4a6f0c3e1d9b7a5f2c4e8',
  createdAt: '2026-11-15T14:30:00.000Z',
  updatedAt: '2026-11-15T15:00:00.000Z',
  startDate: '2026-11-20T18:00:00.000Z',
  endDate: '2026-11-20T23:00:00.000Z',
} as const;

export const paginationMetaExample = {
  total: 125,
  page: 1,
  limit: 20,
  totalPages: 7,
  hasNextPage: true,
  hasPreviousPage: false,
};

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
  refreshToken: samples.refreshToken,
  user: publicUserExample,
};

export const tokenPairExample = {
  accessToken: samples.accessToken,
  tokenType: 'Bearer',
  expiresIn: 900,
  refreshToken: samples.refreshToken,
  user: publicUserExample,
};

export const logoutExample = { message: 'Logged out' };

export const logoutAllExample = { message: 'Logged out of all sessions' };

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
  images: [] as {
    id: string;
    eventId: string;
    url: string;
    position: number;
    createdAt: string;
  }[],
  createdAt: samples.createdAt,
  updatedAt: samples.createdAt,
};

export const galleryImageExample = {
  id: '2f7c5b91-3a8d-42e6-b417-8c9d0e1f2a3b',
  eventId: '8f1c2b3a-4d5e-4f70-8192-a3b4c5d6e7f8',
  url: 'http://localhost:4000/uploads/events/8f1c2b3a-gallery-1.jpg',
  position: 0,
  createdAt: samples.createdAt,
};

export const eventWithImagesExample = {
  ...eventExample,
  images: [
    galleryImageExample,
    {
      ...galleryImageExample,
      id: '5a1e9c47-8b2f-4d63-9e80-1f2a3b4c5d6e',
      url: 'http://localhost:4000/uploads/events/8f1c2b3a-gallery-2.jpg',
      position: 1,
    },
  ],
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

export const cancelledEventExample = {
  ...publishedEventExample,
  status: 'CANCELLED',
  updatedAt: samples.updatedAt,
};

export const completedEventExample = {
  ...publishedEventExample,
  status: 'COMPLETED',
  updatedAt: samples.updatedAt,
};

export const eventWithCoverExample = {
  ...eventExample,
  CoverImage: 'http://localhost:4000/uploads/events/8f1c2b3a-cover.jpg',
  updatedAt: samples.updatedAt,
};

export const ticketExample = {
  id: samples.ticketId,
  name: 'General Admission',
  description: 'Standing access for the full evening.',
  price: 15000,
  currency: 'NGN',
  quantity: 200,
  sold: 0,
  reserved: 0,
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

export const venueExample = {
id: samples.venueId,
name: 'Freedom Park',
address: '1 Independence Way, Victoria Island',
city: 'Lagos',
state: 'Lagos State',
country: 'Nigeria',
capacity: 5000,
latitude: 6.4281,
longitude: 3.4219,
createdAt: samples.createdAt,
updatedAt: samples.createdAt,
};

export const orderExample = {
  id: '6b2f9c41-2d7e-4a83-b0c5-9e8f7a6b5c4d',
  reference: '0f8e7d6c-5b4a-4321-9876-543210fedcba',
  userId: samples.userId,
  status: 'PENDING',
  total: 30000,
  currency: 'NGN',
  expiresAt: '2026-11-15T15:15:00.000Z',
  items: [
    {
      id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      orderId: '6b2f9c41-2d7e-4a83-b0c5-9e8f7a6b5c4d',
      ticketTypeId: samples.ticketId,
      quantity: 2,
      unitPrice: 15000,
      subtotal: 30000,
      createdAt: samples.createdAt,
    },
  ],
  createdAt: samples.createdAt,
  updatedAt: samples.createdAt,
};

