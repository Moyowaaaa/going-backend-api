import { createHash, randomBytes } from 'crypto';

/** Refresh-token lifetime: 30 days. */
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Opaque bearer token: 48 random bytes, base64url-encoded (64 chars). */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/** Only hashes of refresh tokens are stored; a leak of the table yields no usable token. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
