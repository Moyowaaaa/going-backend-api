import { ApiProperty } from '@nestjs/swagger';
import {
  loginExample,
  logoutAllExample,
  logoutExample,
  profileExample,
  publicUserExample,
  registeredUserExample,
  tokenPairExample,
} from '../../common/swagger/samples.js';

export class PublicUserResponse {
  @ApiProperty({ format: 'uuid', example: publicUserExample.id })
  id: string;

  @ApiProperty({ format: 'email', example: publicUserExample.email })
  email: string;

  @ApiProperty({ example: publicUserExample.firstName })
  firstName: string;

  @ApiProperty({ example: publicUserExample.lastName })
  lastName: string;

  @ApiProperty({ example: publicUserExample.isEmailVerified })
  isEmailVerified: boolean;
}

export class RegisteredUserResponse extends PublicUserResponse {
  @ApiProperty({
    format: 'date-time',
    example: registeredUserExample.createdAt,
  })
  createdAt: string;
}

export class LoginResponse {
  @ApiProperty({ example: loginExample.message })
  message: string;

  @ApiProperty({
    description: 'JWT access token. Send it as a Bearer token.',
    example: loginExample.accessToken,
  })
  accessToken: string;

  @ApiProperty({ example: loginExample.tokenType })
  tokenType: string;

  @ApiProperty({
    description: 'Access token lifetime in seconds.',
    example: loginExample.expiresIn,
  })
  expiresIn: number;

  @ApiProperty({
    description:
      'Opaque refresh token, valid for 30 days. Store it securely and exchange it at POST /auth/refresh. It is rotated on every use; an old one stops working.',
    example: loginExample.refreshToken,
  })
  refreshToken: string;

  @ApiProperty({ type: PublicUserResponse })
  user: PublicUserResponse;
}

export class TokenPairResponse {
  @ApiProperty({
    description: 'New JWT access token.',
    example: tokenPairExample.accessToken,
  })
  accessToken: string;

  @ApiProperty({ example: tokenPairExample.tokenType })
  tokenType: string;

  @ApiProperty({ example: tokenPairExample.expiresIn })
  expiresIn: number;

  @ApiProperty({
    description:
      'Replacement refresh token. The token sent in the request no longer works; store this one instead.',
    example: tokenPairExample.refreshToken,
  })
  refreshToken: string;

  @ApiProperty({ type: PublicUserResponse })
  user: PublicUserResponse;
}

export class LogoutResponse {
  @ApiProperty({ example: logoutExample.message })
  message: string;
}

export class LogoutAllResponse {
  @ApiProperty({ example: logoutAllExample.message })
  message: string;
}

export class ProfileResponse {
  @ApiProperty({ format: 'uuid', example: profileExample.id })
  id: string;

  @ApiProperty({ format: 'email', example: profileExample.email })
  email: string;
}
