import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecordStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { toPagination } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, ListUsersDto, ResetPasswordDto, UpdateUserDto } from './users.dto';

const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListUsersDto) {
    const where = query.status ? { status: query.status } : {};
    const [data, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, pagination: toPagination(query.page, query.pageSize, totalItems) };
  }

  async create(dto: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        data: {
          username: dto.username.trim(),
          name: dto.name.trim(),
          passwordHash: await bcrypt.hash(dto.password, 12),
          role: dto.role,
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Tên đăng nhập đã tồn tại');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    if (id === currentUserId && (dto.status === RecordStatus.INACTIVE || dto.role === UserRole.STAFF)) {
      throw new BadRequestException('Không thể tự hạ quyền hoặc vô hiệu hoá tài khoản đang đăng nhập');
    }
    await this.ensureUser(id);
    return this.prisma.user.update({
      where: { id },
      data: { ...dto, ...(dto.name ? { name: dto.name.trim() } : {}) },
      select: publicUserSelect,
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.ensureUser(id);
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(dto.password, 12) },
      select: publicUserSelect,
    });
  }

  private async ensureUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
  }
}
