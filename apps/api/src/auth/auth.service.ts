import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    const accessToken = await this.jwt.signAsync({ sub: user.id, username: user.username, role: user.role, name: user.name });
    return { accessToken, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
  }
}
