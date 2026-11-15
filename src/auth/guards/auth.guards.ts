import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '../utils/jwt.util.js';

export function readBearerToken(request: {
  headers: Record<string, unknown>;
}): string | undefined {
  const header = request.headers.authorization;

  return typeof header === 'string' && header.startsWith('Bearer ')
    ? header.split(' ')[1]
    : undefined;
}

function verifyOrThrow(token: string) {
  try {
    return verifyToken(token);
  } catch {
    throw new UnauthorizedException('Invalid or expired access token');
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const payload = verifyOrThrow(token);

    request.user = {
      id: payload.sub,
      email: payload.email,
    };

    return true;
  }
}

/**
 * Same token handling as AuthGuard, but an anonymous caller is let through with
 * no request.user. A token that is present yet invalid is still rejected, so a
 * broken token never silently drops the caller down to public-only results.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = readBearerToken(request);

    if (token) {
      const payload = verifyOrThrow(token);

      request.user = {
        id: payload.sub,
        email: payload.email,
      };
    }

    return true;
  }
}
