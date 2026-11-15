import { Body, Controller, Get, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthGuard } from './guards/auth.guards.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './decorators/current-user.decorator.js';
import { ApiErrorExamples, ApiErrorResponse, ApiProtected } from '../common/swagger/api-error.js';
import { ApiWrappedResponse } from '../common/swagger/api-wrapped-response.js';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a user',
    description:
      'Creates an account. The password is hashed and is not part of the response.',
  })
  @ApiWrappedResponse({
    status: HttpStatus.CREATED,
    description: 'Account created.',
    model: RegisteredUserResponse,
    example: registeredUserExample,
  })
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    'The body failed validation.',
    [
      'email must be an email',
      'password must be longer than or equal to 8 characters',
    ],
    'Bad Request',
  )
  @ApiErrorResponse(
    HttpStatus.CONFLICT,
    'An account with this email already exists.',
    'Email already in use, please try something else',
    'Conflict',
  )
  register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Log in',
    description:
      'Checks the email and password and returns a Bearer access token that expires in 900 seconds.',
  })
  @ApiWrappedResponse({
    status: HttpStatus.CREATED,
    description: 'Credentials accepted. The token is inside data.',
    model: LoginResponse,
    example: loginExample,
  })
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    'The body failed validation.',
    ['email must be an email'],
    'Bad Request',
  )
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
  @ApiProtected()
  @ApiOperation({
    summary: 'Current user',
    description:
      'Returns the id and email taken from the access token. It does not load the user record.',
  })
  @ApiWrappedResponse({
    status: HttpStatus.OK,
    description: 'Profile from the access token.',
    model: ProfileResponse,
    example: profileExample,
  })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
