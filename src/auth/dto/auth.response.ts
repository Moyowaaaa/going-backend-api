import { ApiProperty } from '@nestjs/swagger';
import {
  loginExample,
  profileExample,
  publicUserExample,
  registeredUserExample,
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

  @ApiProperty({ type: PublicUserResponse })
  user: PublicUserResponse;
}

export class ProfileResponse {
  @ApiProperty({ format: 'uuid', example: profileExample.id })
  id: string;

  @ApiProperty({ format: 'email', example: profileExample.email })
  email: string;
}
