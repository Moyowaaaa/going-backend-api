import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { hashPassword, verifyPassword } from './utils/password-util.js';
import { LoginDto } from './dto/login.dto.js';
import { signToken } from './utils/jwt.util.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from './utils/refresh-token.util.js';
import { RefreshDto } from './dto/refresh.dto.js';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isEmailVerified: true,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  //Register user
  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: registerDto.email,
      },
    });

    if (existingUser)
      throw new ConflictException(
        'Email already in use, please try something else',
      );

    const password = await hashPassword(registerDto.password);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash: password,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      },
      select: {
        ...PUBLIC_USER_SELECT,
        createdAt: true,
      },
    });

    return user;
  }

  //Login user
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user)
      throw new UnauthorizedException(
        "User doesn't exist, please check details and try again",
      );
    const isPasswordValid = await verifyPassword(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const refreshToken = await this.createRefreshToken(user.id);

    return {
      message: 'Login successful',
      ...this.issueAccessToken(user.id, user.email),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  /**
   * Exchange a refresh token for a new access token.
   * The presented token is revoked and a replacement is issued (rotation).
   * Presenting an already-revoked token means it was copied: every live
   * session of that user is revoked before the request is rejected.
   */
  async refresh(dto: RefreshDto) {
    const tokenHash = hashRefreshToken(dto.refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) throw new UnauthorizedException('Invalid refresh token');

    if (existing.revokedAt) {
      await this.revokeAllRefreshTokens(existing.userId);
      this.logger.warn(
        `Refresh token reuse detected for user ${existing.userId}; all sessions revoked`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    const newToken = generateRefreshToken();

    const rotated = await this.prisma.$transaction(async (tx) => {
      // Claim the token: only one concurrent refresh may win.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (claimed.count === 0) return false;

      const replacement = await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashRefreshToken(newToken),
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
        select: { id: true },
      });

      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { replacedById: replacement.id },
      });

      return true;
    });

    if (!rotated) throw new UnauthorizedException('Invalid refresh token');

    return {
      ...this.issueAccessToken(user.id, user.email),
      refreshToken: newToken,
      user,
    };
  }

  /**
   * Revoke one session. With no refresh token, every session of the caller
   * is revoked instead.
   */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash: hashRefreshToken(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      return { message: 'Logged out' };
    }

    await this.revokeAllRefreshTokens(userId);
    return { message: 'Logged out of all sessions' };
  }

  /** Revoke every live session of the caller. */
  async logoutAll(userId: string) {
    await this.revokeAllRefreshTokens(userId);
    return { message: 'Logged out of all sessions' };
  }

  /**
   * Delete expired tokens and revoked tokens older than the refresh lifetime,
   * so the table stays bounded.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupRefreshTokens() {
    const now = new Date();
    const revokedCutoff = new Date(now.getTime() - REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { lt: revokedCutoff } },
        ],
      },
    });
  }

  private issueAccessToken(userId: string, email: string) {
    return {
      accessToken: signToken({ sub: userId, email }),
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(token),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return token;
  }

  private async revokeAllRefreshTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
