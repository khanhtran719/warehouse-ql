import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockImport, StockImportItem, VoucherStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPagination } from '../common/pagination.dto';
import { CreateImportDto, ListVoucherDto, VoucherItemDto } from './dto';
import { roundMoney, roundQty, sumLineAmount, weightedAverageCost } from './inventory-math';

@Injectable()
export class StockImportsService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListVoucherDto) {
    const where = this.buildWhere(query);

    const [data, totalItems] = await Promise.all([
      this.prisma.stockImport.findMany({
        where,
        include: { createdBy: { select: { name: true } }, items: { include: { product: true } } },
        orderBy: { importDate: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.stockImport.count({ where }),
    ]);

    return { data, pagination: toPagination(query.page, query.pageSize, totalItems) };
  }

  get(id: string) {
    return this.prisma.stockImport.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, createdBy: { select: { name: true } } },
    });
  }

  async create(dto: CreateImportDto, userId: string) {
    const code = await this.nextCode('PN');
    const totalAmount = this.calculateTotalAmount(dto.items);

    return this.prisma.stockImport.create({
      data: {
        code,
        importDate: new Date(dto.importDate),
        note: dto.note,
        createdById: userId,
        totalAmount,
        items: { create: this.toImportItemCreates(dto.items) },
      },
      include: { items: true },
    });
  }

  async update(id: string, dto: CreateImportDto) {
    const voucher = await this.findVoucherOrThrow(id);
    this.ensureDraft(voucher);

    return this.prisma.$transaction(async (tx) => {
      await tx.stockImportItem.deleteMany({ where: { stockImportId: id } });
      return tx.stockImport.update({
        where: { id },
        data: {
          importDate: new Date(dto.importDate),
          note: dto.note,
          totalAmount: this.calculateTotalAmount(dto.items),
          items: { create: this.toImportItemCreates(dto.items) },
        },
        include: { items: true },
      });
    });
  }

  async confirm(id: string, userId: string) {
    const voucher = await this.prisma.stockImport.findUnique({ where: { id }, include: { items: true } });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu nhập');
    this.ensureDraft(voucher);
    if (voucher.items.length === 0) throw new BadRequestException('Phiếu nhập chưa có hàng hoá');

    return this.prisma.$transaction(async (tx) => {
      for (const item of voucher.items) {
        await this.applyImportItem(tx, voucher, item, userId);
      }

      return tx.stockImport.update({
        where: { id },
        data: { status: VoucherStatus.CONFIRMED, confirmedAt: new Date(), confirmedById: userId },
        include: { items: { include: { product: true } } },
      });
    });
  }

  async cancel(id: string) {
    const voucher = await this.findVoucherOrThrow(id);
    this.ensureDraft(voucher, 'V1 chỉ huỷ phiếu nháp để giữ đúng giá vốn bình quân; phiếu đã xác nhận cần phiếu điều chỉnh riêng');

    return this.prisma.stockImport.update({
      where: { id },
      data: { status: VoucherStatus.CANCELLED, cancelledAt: new Date() },
    });
  }

  private buildWhere(query: ListVoucherDto): Prisma.StockImportWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? { importDate: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
    };
  }

  private calculateTotalAmount(items: VoucherItemDto[]) {
    return roundMoney(items.reduce((sum, item) => sum + sumLineAmount(item.quantity, item.unitPrice), 0));
  }

  private toImportItemCreates(items: VoucherItemDto[]) {
    return items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalAmount: sumLineAmount(item.quantity, item.unitPrice),
    }));
  }

  private async applyImportItem(
    tx: Prisma.TransactionClient,
    voucher: StockImport,
    item: StockImportItem,
    userId: string,
  ) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new NotFoundException('Không tìm thấy hàng hoá');

    const oldStock = Number(product.currentStock);
    const quantity = Number(item.quantity);
    const nextStock = roundQty(oldStock + quantity);
    const nextCost = weightedAverageCost({
      stock: oldStock,
      averageCost: Number(product.averageCost),
      quantity,
      unitPrice: Number(item.unitPrice),
    });

    await tx.product.update({ where: { id: product.id }, data: { currentStock: nextStock, averageCost: nextCost } });
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        movementType: 'IMPORT',
        referenceType: 'StockImport',
        referenceId: voucher.id,
        quantityChange: quantity,
        stockBefore: oldStock,
        stockAfter: nextStock,
        costPrice: item.unitPrice,
        createdById: userId,
        note: voucher.code,
      },
    });
  }

  private async findVoucherOrThrow(id: string) {
    const voucher = await this.prisma.stockImport.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu nhập');
    return voucher;
  }

  private ensureDraft(voucher: StockImport, message = 'Phiếu nhập không còn ở trạng thái nháp') {
    if (voucher.status !== VoucherStatus.DRAFT) {
      throw new ConflictException(message);
    }
  }

  private async nextCode(prefix: string) {
    return `${prefix}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-6)}`;
  }
}
