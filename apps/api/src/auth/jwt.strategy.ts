import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getRequiredConfig } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredConfig(config, 'JWT_SECRET'),
    });
  }
  async validate(payload: { sub: string; username: string; role: UserRole; name: string; iat?: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, name: true, role: true, status: true, updatedAt: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản không còn hoạt động');
    }
    const updatedAtSeconds = Math.floor(user.updatedAt.getTime() / 1000);
    if (!payload.iat || payload.iat < updatedAtSeconds) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hiệu lực');
    }
    return { id: user.id, username: user.username, role: user.role, name: user.name };
  }
}
