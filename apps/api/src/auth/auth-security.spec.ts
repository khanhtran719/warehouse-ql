import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { CatalogController } from '../catalog/catalog.controller';
import { ROLES_KEY } from '../common/roles.decorator';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { LoginRateLimiter } from './login-rate-limiter';

describe('authentication and authorization hardening', () => {
  it('rejects an access token when its user is no longer active', async () => {
    const config = { get: vi.fn().mockReturnValue('test-jwt-secret') };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          username: 'staff',
          name: 'Staff',
          role: UserRole.STAFF,
          status: 'INACTIVE',
        }),
      },
    };
    const strategy = new JwtStrategy(config as never, prisma as never);

    await expect(
      strategy.validate({
        sub: 'user-1',
        username: 'staff',
        name: 'Staff',
        role: UserRole.STAFF,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requires ADMIN role for catalog mutations', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CatalogController.prototype.createProduct)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, CatalogController.prototype.updateProduct)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, CatalogController.prototype.createCategory)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, CatalogController.prototype.createUnit)).toEqual([UserRole.ADMIN]);
  });

  it('rejects tokens issued before a password, role, or status update', async () => {
    const config = { get: vi.fn().mockReturnValue('test-jwt-secret') };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          username: 'staff',
          name: 'Staff',
          role: UserRole.STAFF,
          status: 'ACTIVE',
          updatedAt: new Date('2026-07-11T08:05:00.000Z'),
        }),
      },
    };
    const strategy = new JwtStrategy(config as never, prisma as never);

    await expect(
      strategy.validate({
        sub: 'user-1',
        username: 'staff',
        name: 'Staff',
        role: UserRole.STAFF,
        iat: Math.floor(new Date('2026-07-11T08:00:00.000Z').getTime() / 1000),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks repeated login failures before checking another password', async () => {
    const prisma = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
    const jwt = { signAsync: vi.fn() };
    const service = new AuthService(prisma as never, jwt as never, new LoginRateLimiter());

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(service.login('staff', 'wrong-password')).rejects.toThrow('Sai tài khoản hoặc mật khẩu');
    }

    await expect(service.login('staff', 'wrong-password')).rejects.toThrow('Thử đăng nhập quá nhiều lần');
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(5);
  });
});
