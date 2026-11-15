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
import { AuthGuard } from './guards/auth.guards.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './decorators/current-user.decorator.js';
import { ApiErrorExamples } from '../common/swagger/api-error.js';
import {
  loginExample,
  profileExample,
  registeredUserExample,
} from '../common/swagger/samples.js';
import {
  LoginResponse,
  ProfileResponse,
  RegisteredUserResponse,
} from './dto/auth.response.js';
import { ApiControllerTag } from '../common/decorators/api-controller-tag.decorator.js';
import {
  ApiCreate,
  ApiGet,
} from '../common/decorators/api-operation.decorator.js';
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
      'Checks the email and password and returns a Bearer access token that expires in 900 seconds.',
    responseDescription: 'Credentials accepted. The token is inside data.',
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
