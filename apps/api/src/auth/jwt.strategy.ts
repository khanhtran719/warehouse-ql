import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getRequiredConfig } from '../config/env';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredConfig(config, 'JWT_SECRET'),
    });
  }
  async validate(payload: { sub: string; username: string; role: string; name: string }) {
    return { id: payload.sub, username: payload.username, role: payload.role, name: payload.name };
  }
}
