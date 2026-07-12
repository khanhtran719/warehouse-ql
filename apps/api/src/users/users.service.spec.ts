import { BadRequestException } from '@nestjs/common';
import { RecordStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('creates a user with a bcrypt hash and never returns passwordHash', async () => {
    const prisma = {
      user: {
        create: vi.fn().mockImplementation(({ data }) => ({
          id: 'user-2',
          username: data.username,
          name: data.name,
          role: data.role,
          status: RecordStatus.ACTIVE,
        })),
      },
    };
    const service = new UsersService(prisma as never);

    const result = await service.create({
      username: 'staff01',
      name: 'Nhân viên 01',
      password: 'password123',
      role: UserRole.STAFF,
    });

    const createData = prisma.user.create.mock.calls[0][0].data;
    expect(await bcrypt.compare('password123', createData.passwordHash)).toBe(true);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('prevents an administrator from deactivating their own account', async () => {
    const prisma = { user: { update: vi.fn() } };
    const service = new UsersService(prisma as never);

    await expect(service.update('admin-1', { status: RecordStatus.INACTIVE }, 'admin-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
