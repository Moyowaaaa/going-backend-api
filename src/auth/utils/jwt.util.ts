import { createHmac, timingSafeEqual } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured');
}

const JWT_ISSUER = 'going-api';
const JWT_AUDIENCE = 'going-client';
const JWT_EXPIRES_IN = 15 * 60; // 15 minutes

interface VerifiedTokenPayload {
  sub: string;
  email: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

interface TokenPayload {
  sub: string;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const claims = {
    ...payload,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    iat: now,
    exp: now + JWT_EXPIRES_IN,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac('sha256', JWT_SECRET as string)
    .update(unsignedToken)
    .digest('base64url');

  return `${unsignedToken}.${signature}`;
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function verifyToken(token: string): VerifiedTokenPayload {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }

  const [encodedHeader, encodedPayload, suppliedSignature] = parts;

  const header = JSON.parse(base64UrlDecode(encodedHeader));

  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('Invalid token');
  }

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = createHmac('sha256', JWT_SECRET as string)
    .update(unsignedToken)
    .digest();

  const actualSignature = Buffer.from(suppliedSignature, 'base64url');

  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new Error('Invalid token');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    payload.iss !== JWT_ISSUER ||
    payload.aud !== JWT_AUDIENCE ||
    !Number.isInteger(payload.iat) ||
    !Number.isInteger(payload.exp)
  ) {
    throw new Error('Invalid token');
  }

  const now = Math.floor(Date.now() / 1000);

  if (payload.exp <= now || payload.iat > now) {
    throw new Error('Token expired or invalid');
  }

  return payload as VerifiedTokenPayload;
}
