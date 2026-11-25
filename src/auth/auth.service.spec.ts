import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { hashPassword } from './utils/password-util.js';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    refreshToken: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeAll(() => {
    process.env.JWT_SECRET ??= 'auth-service-spec';
  });

  beforeEach(async () => {
    prisma = {
      user: { findUnique: vi.fn() },
      refreshToken: {
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 'token-1' }),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn(),
    };

    prisma.$transaction.mockImplementation(
      (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  const userRecord = async () => ({
    id: 'user-1',
    email: 'ada@going.example',
    passwordHash: await hashPassword('correct-horse'),
    firstName: 'Ada',
    lastName: 'Lovelace',
    isEmailVerified: false,
  });

  it('login returns an access token and stores only a hash of the refresh token', async () => {
    prisma.user.findUnique.mockResolvedValue(await userRecord());

    const result = await service.login({
      email: 'ada@going.example',
      password: 'correct-horse',
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));

    const stored = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(sha256(result.refreshToken));
    expect(stored.tokenHash).not.toBe(result.refreshToken);
  });

  it('refresh rotates the token and revokes the presented one', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.user.findUnique.mockResolvedValue(await userRecord());

    const result = await service.refresh({ refreshToken: 'old-token' });

    expect(result.refreshToken).not.toBe('old-token');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'token-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      }),
    );
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { replacedById: 'token-1' },
      }),
    );
  });

  it('refresh rejects an expired token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(
      service.refresh({ refreshToken: 'expired-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refresh of an already-revoked token revokes every session', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.refresh({ refreshToken: 'reused-token' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('refresh rejects an unknown token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(
      service.refresh({ refreshToken: 'nope' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('logout with a token revokes only that token', async () => {
    await service.logout('user-1', 'session-token');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        tokenHash: sha256('session-token'),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('logout without a token revokes every session', async () => {
    await service.logout('user-1');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('logout-all revokes every session', async () => {
    await service.logoutAll('user-1');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
