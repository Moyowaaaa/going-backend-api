import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthGuard } from './guards/auth.guards.js';
import {  CurrentUser } from './decorators/current-user.decorator.js';
import type {AuthenticatedUser} from './decorators/current-user.decorator.js'



@Controller('auth')
export class AuthController {
    constructor(private readonly authService:AuthService){}

    //Register user '/auth'
    @Post('register')
    register(@Body() data:RegisterDto){
        return this.authService.register(data)

    }

    // Login user '/auth'
    @Post('login')
    login(@Body() data:LoginDto){
        return this.authService.login(data)
    }

    //Get user profile '/me'
    @Get('me')
    @UseGuards(AuthGuard)
    getProfile(@CurrentUser() user: AuthenticatedUser) {
        return user;
      }

}
