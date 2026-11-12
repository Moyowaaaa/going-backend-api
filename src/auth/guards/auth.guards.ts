import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
import { verifyToken } from '../utils/jwt.util.js';
  
  
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
  
      try {
        const payload = verifyToken(token);
  
        request.user = {
          id: payload.sub,
          email: payload.email,
        };
  
        return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired access token');
      }
    }
  }