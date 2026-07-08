import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString() username!: string;
  @IsString() @MinLength(6) password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@CurrentUser() user: CurrentUser) {
    return user;
  }
}
