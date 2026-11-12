import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { hashPassword, verifyPassword } from './utils/password-util.js';
import { registerSchema } from 'class-validator';
import { LoginDto } from './dto/login.dto.js';
import { signToken } from './utils/jwt.util.js';

@Injectable()
export class AuthService {
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
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
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

    const accessToken = signToken({
      sub: user.id,
      email: user.email,
    });

    return {
      message: 'Login successful',
      accessToken,
    tokenType: 'Bearer',
    expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }
}
