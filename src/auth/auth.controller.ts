import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LogoutDto, RefreshDto } from './dto/refresh.dto.js';
import { AuthGuard } from './guards/auth.guards.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './decorators/current-user.decorator.js';
import { ApiErrorExamples } from '../common/swagger/api-error.js';
import {
  loginExample,
  logoutAllExample,
  logoutExample,
  profileExample,
  registeredUserExample,
  tokenPairExample,
} from '../common/swagger/samples.js';
import {
  LoginResponse,
  LogoutAllResponse,
  LogoutResponse,
  ProfileResponse,
  RegisteredUserResponse,
  TokenPairResponse,
} from './dto/auth.response.js';
import { ApiControllerTag } from '../common/decorators/api-controller-tag.decorator.js';
import { ApiCreate, ApiGet } from '../common/decorators/api-operation.decorator.js';
import {
  ApiConflict,
  ApiValidationError,
} from '../common/decorators/api-error.decorator.js';

@ApiControllerTag('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiCreate({
    summary: 'Register a user',
    description:
      'Creates an account. The password is hashed and is not part of the response.',
    responseDescription: 'Account created.',
    model: RegisteredUserResponse,
    example: registeredUserExample,
  })
  @ApiValidationError('The body failed validation.', [
    'email must be an email',
    'password must be longer than or equal to 8 characters',
  ])
  @ApiConflict(
    'An account with this email already exists.',
    'Email already in use, please try something else',
  )
  register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('login')
  @ApiCreate({
    summary: 'Log in',
    description:
      'Checks the email and password and returns a Bearer access token that expires in 900 seconds, plus a refresh token valid for 30 days.',
    responseDescription: 'Credentials accepted. The tokens are inside data.',
    model: LoginResponse,
    example: loginExample,
  })
  @ApiValidationError('The body failed validation.', ['email must be an email'])
  @ApiErrorExamples(
    HttpStatus.UNAUTHORIZED,
    'No account uses this email, or the password does not match.',
    {
      unknownEmail: {
        summary: 'No account for this email',
        message: "User doesn't exist, please check details and try again",
        error: 'Unauthorized',
      },
      wrongPassword: {
        summary: 'Password does not match',
        message: 'Invalid email or password',
        error: 'Unauthorized',
      },
    },
  )
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @Post('refresh')
  @ApiCreate({
    summary: 'Refresh tokens',
    description:
      'Exchanges a refresh token for a new access token and a new refresh token. The token sent is revoked and replaced, so send the returned refreshToken next time. Reusing an already-rotated token is treated as theft: every session of that account is revoked and the request answers 401.',
    responseDescription: 'A new token pair.',
    model: TokenPairResponse,
    example: tokenPairExample,
  })
  @ApiValidationError('The body failed validation.', [
    'refreshToken should not be empty',
  ])
  @ApiErrorExamples(
    HttpStatus.UNAUTHORIZED,
    'The refresh token is unknown, expired, already rotated or revoked.',
    {
      unknown: {
        summary: 'Unknown or revoked token',
        message: 'Invalid refresh token',
        error: 'Unauthorized',
      },
      expired: {
        summary: 'Token past its 30-day lifetime',
        message: 'Refresh token expired',
        error: 'Unauthorized',
      },
    },
  )
  refresh(@Body() data: RefreshDto) {
    return this.authService.refresh(data);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiCreate({
    summary: 'Log out',
    description:
      'Revokes the refresh token sent in the body, ending that one session. Send no body to revoke every session of the caller instead. The current access token stays valid until it expires (at most 15 minutes).',
    responseDescription: 'Session revoked.',
    model: LogoutResponse,
    example: logoutExample,
    protected: true,
  })
  @ApiValidationError('The body failed validation.', [
    'refreshToken must be a string',
  ])
  logout(@CurrentUser('id') userId: string, @Body() data: LogoutDto) {
    return this.authService.logout(userId, data.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  @ApiCreate({
    summary: 'Log out everywhere',
    description:
      'Revokes every refresh token of the caller, on every device. No body is read. Access tokens already issued stay valid until they expire (at most 15 minutes).',
    responseDescription: 'All sessions revoked.',
    model: LogoutAllResponse,
    example: logoutAllExample,
    protected: true,
  })
  logoutAll(@CurrentUser('id') userId: string) {
    return this.authService.logoutAll(userId);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiGet({
    summary: 'Current user',
    description:
      'Returns the id and email taken from the access token. It does not load the user record.',
    responseDescription: 'Profile from the access token.',
    model: ProfileResponse,
    example: profileExample,
    protected: true,
  })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
