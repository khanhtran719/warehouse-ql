import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: config.get('JWT_SECRET') ?? 'dev-secret' });
  }
  async validate(payload: { sub: string; username: string; role: string; name: string }) {
    return { id: payload.sub, username: payload.username, role: payload.role, name: payload.name };
  }
}
