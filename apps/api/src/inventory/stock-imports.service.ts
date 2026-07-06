import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VoucherStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPagination } from '../common/pagination.dto';
import { CreateImportDto, ListVoucherDto } from './dto';
import { roundMoney, roundQty, sumLineAmount, weightedAverageCost } from './inventory-math';

@Injectable()
export class StockImportsService {
  constructor(private prisma: PrismaService) {}

  async list(q: ListVoucherDto) {
    const where: Prisma.StockImportWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.from || q.to ? { importDate: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } } : {}),
    };
    const [data, totalItems] = await Promise.all([
      this.prisma.stockImport.findMany({ where, include: { createdBy: { select: { name: true } }, items: { include: { product: true } } }, orderBy: { importDate: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.stockImport.count({ where }),
    ]);
    return { data, pagination: toPagination(q.page, q.pageSize, totalItems) };
  }

  get(id: string) { return this.prisma.stockImport.findUnique({ where: { id }, include: { items: { include: { product: true } }, createdBy: { select: { name: true } } } }); }

  async create(dto: CreateImportDto, userId: string) {
    const code = await this.nextCode('PN');
    const totalAmount = roundMoney(dto.items.reduce((s, i) => s + sumLineAmount(i.quantity, i.unitPrice), 0));
    return this.prisma.stockImport.create({ data: { code, importDate: new Date(dto.importDate), note: dto.note, createdById: userId, totalAmount, items: { create: dto.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, totalAmount: sumLineAmount(i.quantity, i.unitPrice) })) } }, include: { items: true } });
  }

  async update(id: string, dto: CreateImportDto) {
    const voucher = await this.prisma.stockImport.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu nhập');
    if (voucher.status !== VoucherStatus.DRAFT) throw new ConflictException('Chỉ được sửa phiếu nháp');
    const totalAmount = roundMoney(dto.items.reduce((s, i) => s + sumLineAmount(i.quantity, i.unitPrice), 0));
    return this.prisma.$transaction(async tx => {
      await tx.stockImportItem.deleteMany({ where: { stockImportId: id } });
      return tx.stockImport.update({ where: { id }, data: { importDate: new Date(dto.importDate), note: dto.note, totalAmount, items: { create: dto.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, totalAmount: sumLineAmount(i.quantity, i.unitPrice) })) } }, include: { items: true } });
    });
  }

  async confirm(id: string, userId: string) {
    const voucher = await this.prisma.stockImport.findUnique({ where: { id }, include: { items: true } });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu nhập');
    if (voucher.status !== VoucherStatus.DRAFT) throw new ConflictException('Phiếu nhập không còn ở trạng thái nháp');
    if (voucher.items.length === 0) throw new BadRequestException('Phiếu nhập chưa có hàng hoá');

    return this.prisma.$transaction(async tx => {
      for (const item of voucher.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundException('Không tìm thấy hàng hoá');
        const oldStock = Number(product.currentStock);
        const qty = Number(item.quantity);
        const nextStock = roundQty(oldStock + qty);
        const nextCost = weightedAverageCost({ stock: oldStock, averageCost: Number(product.averageCost), quantity: qty, unitPrice: Number(item.unitPrice) });
        await tx.product.update({ where: { id: product.id }, data: { currentStock: nextStock, averageCost: nextCost } });
        await tx.stockMovement.create({ data: { productId: product.id, movementType: 'IMPORT', referenceType: 'StockImport', referenceId: voucher.id, quantityChange: qty, stockBefore: oldStock, stockAfter: nextStock, costPrice: item.unitPrice, createdById: userId, note: voucher.code } });
      }
      return tx.stockImport.update({ where: { id }, data: { status: VoucherStatus.CONFIRMED, confirmedAt: new Date(), confirmedById: userId }, include: { items: { include: { product: true } } } });
    });
  }

  async cancel(id: string) {
    const voucher = await this.prisma.stockImport.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu nhập');
    if (voucher.status !== VoucherStatus.DRAFT) throw new ConflictException('V1 chỉ huỷ phiếu nháp để giữ đúng giá vốn bình quân; phiếu đã xác nhận cần phiếu điều chỉnh riêng');
    return this.prisma.stockImport.update({ where: { id }, data: { status: VoucherStatus.CANCELLED, cancelledAt: new Date() } });
  }

  private async nextCode(prefix: string) { return `${prefix}${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-6)}`; }
}
