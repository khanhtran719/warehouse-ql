import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toPagination } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListPartnersDto, PartnerDto } from './partners.dto';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  listCustomers(query: ListPartnersDto) {
    const where = this.buildWhere<Prisma.CustomerWhereInput>(query);
    return this.paginated(
      query,
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.customer.count({ where }),
    );
  }

  listSuppliers(query: ListPartnersDto) {
    const where = this.buildWhere<Prisma.SupplierWhereInput>(query);
    return this.paginated(
      query,
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.supplier.count({ where }),
    );
  }

  async createCustomer(dto: PartnerDto) {
    try {
      return await this.prisma.customer.create({ data: this.normalize(dto) });
    } catch (error) {
      this.handleUnique(error, 'Mã khách hàng đã tồn tại');
    }
  }

  async createSupplier(dto: PartnerDto) {
    try {
      return await this.prisma.supplier.create({ data: this.normalize(dto) });
    } catch (error) {
      this.handleUnique(error, 'Mã nhà cung cấp đã tồn tại');
    }
  }

  async updateCustomer(id: string, dto: PartnerDto) {
    await this.ensureCustomer(id);
    try {
      return await this.prisma.customer.update({ where: { id }, data: this.normalize(dto) });
    } catch (error) {
      this.handleUnique(error, 'Mã khách hàng đã tồn tại');
    }
  }

  async updateSupplier(id: string, dto: PartnerDto) {
    await this.ensureSupplier(id);
    try {
      return await this.prisma.supplier.update({ where: { id }, data: this.normalize(dto) });
    } catch (error) {
      this.handleUnique(error, 'Mã nhà cung cấp đã tồn tại');
    }
  }

  private async paginated<T>(query: ListPartnersDto, dataPromise: Promise<T[]>, countPromise: Promise<number>) {
    const [data, totalItems] = await Promise.all([dataPromise, countPromise]);
    return { data, pagination: toPagination(query.page, query.pageSize, totalItems) };
  }

  private buildWhere<T extends Prisma.CustomerWhereInput | Prisma.SupplierWhereInput>(query: ListPartnersDto): T {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search, mode: 'insensitive' as const } },
              { taxCode: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    } as T;
  }

  private normalize(dto: PartnerDto) {
    return {
      ...dto,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      phone: this.optional(dto.phone),
      email: this.optional(dto.email),
      address: this.optional(dto.address),
      taxCode: this.optional(dto.taxCode),
      contactPerson: this.optional(dto.contactPerson),
      note: this.optional(dto.note),
    };
  }

  private optional(value?: string) {
    return value?.trim() || null;
  }

  private async ensureCustomer(id: string) {
    if (!(await this.prisma.customer.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }
  }

  private async ensureSupplier(id: string) {
    if (!(await this.prisma.supplier.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Không tìm thấy nhà cung cấp');
    }
  }

  private handleUnique(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(message);
    }
    throw error;
  }
}
