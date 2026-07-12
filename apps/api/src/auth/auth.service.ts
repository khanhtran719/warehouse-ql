import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginRateLimiter } from './login-rate-limiter';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private loginRateLimiter: LoginRateLimiter,
  ) {}

  async login(username: string, password: string) {
    this.loginRateLimiter.assertAllowed(username);
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || user.status !== 'ACTIVE') {
      this.loginRateLimiter.recordFailure(username);
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      this.loginRateLimiter.recordFailure(username);
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    }
    this.loginRateLimiter.reset(username);
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });
    return { accessToken, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
  }
}
