import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPagination } from '../common/pagination.dto';
import { ListProductsDto, ProductDto, SimpleNameDto } from './dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async listProducts(query: ListProductsDto) {
    const where = this.buildProductWhere(query);
    const pagination = { skip: (query.page - 1) * query.pageSize, take: query.pageSize };

    const [data, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, unit: true },
        orderBy: { updatedAt: 'desc' },
        ...pagination,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, pagination: toPagination(query.page, query.pageSize, totalItems) };
  }

  async createProduct(dto: ProductDto) {
    try {
      return await this.prisma.product.create({ data: dto, include: { category: true, unit: true } });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Mã hàng đã tồn tại');
      }
      throw error;
    }
  }

  async updateProduct(id: string, dto: ProductDto) {
    await this.ensureProduct(id);
    try {
      return await this.prisma.product.update({ where: { id }, data: dto, include: { category: true, unit: true } });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Mã hàng đã tồn tại');
      }
      throw error;
    }
  }

  getProduct(id: string) {
    return this.prisma.product.findUnique({ where: { id }, include: { category: true, unit: true } });
  }

  movements(id: string) {
    return this.prisma.stockMovement.findMany({ where: { productId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  categories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  units() {
    return this.prisma.unit.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(dto: SimpleNameDto) {
    try {
      return await this.prisma.category.create({ data: dto });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Nhóm hàng đã tồn tại');
      }
      throw error;
    }
  }

  async createUnit(dto: SimpleNameDto) {
    try {
      return await this.prisma.unit.create({ data: dto });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Đơn vị tính đã tồn tại');
      }
      throw error;
    }
  }

  private buildProductWhere(query: ListProductsDto): Prisma.ProductWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search ? { OR: this.searchProductByCodeOrName(query.search) } : {}),
    };
  }

  private searchProductByCodeOrName(search: string): Prisma.ProductWhereInput[] {
    return [{ code: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }];
  }

  private async ensureProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy hàng hoá');
    }
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
