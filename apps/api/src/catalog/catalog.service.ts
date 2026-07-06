import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPagination } from '../common/pagination.dto';
import { ListProductsDto, ProductDto, SimpleNameDto } from './dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async listProducts(q: ListProductsDto) {
    const where: Prisma.ProductWhereInput = {
      ...(q.status ? { status: q.status as any } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.search ? { OR: [{ code: { contains: q.search, mode: 'insensitive' } }, { name: { contains: q.search, mode: 'insensitive' } }] } : {}),
    };
    const [data, totalItems] = await Promise.all([
      this.prisma.product.findMany({ where, include: { category: true, unit: true }, orderBy: { updatedAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.product.count({ where }),
    ]);
    return { data, pagination: toPagination(q.page, q.pageSize, totalItems) };
  }
  async createProduct(dto: ProductDto) {
    try { return await this.prisma.product.create({ data: dto, include: { category: true, unit: true } }); }
    catch (e) { if ((e as any).code === 'P2002') throw new ConflictException('Mã hàng đã tồn tại'); throw e; }
  }
  async updateProduct(id: string, dto: ProductDto) {
    await this.ensureProduct(id);
    return this.prisma.product.update({ where: { id }, data: dto, include: { category: true, unit: true } });
  }
  getProduct(id: string) { return this.prisma.product.findUnique({ where: { id }, include: { category: true, unit: true } }); }
  movements(id: string) { return this.prisma.stockMovement.findMany({ where: { productId: id }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  private async ensureProduct(id: string) { if (!(await this.prisma.product.findUnique({ where: { id } }))) throw new NotFoundException('Không tìm thấy hàng hoá'); }

  categories() { return this.prisma.category.findMany({ orderBy: { name: 'asc' } }); }
  units() { return this.prisma.unit.findMany({ orderBy: { name: 'asc' } }); }
  createCategory(dto: SimpleNameDto) { return this.prisma.category.create({ data: dto }); }
  createUnit(dto: SimpleNameDto) { return this.prisma.unit.create({ data: dto }); }
}
