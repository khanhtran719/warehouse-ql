import { BadRequestException, ConflictException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { ExportType, Prisma, VoucherStatus } from '@prisma/client';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { toPagination } from '../common/pagination.dto';
import { CreateExportDto, ExportExcelDto, ListExportDto } from './dto';
import { assertCanExport, roundMoney, roundQty, sumLineAmount } from './inventory-math';

@Injectable()
export class StockExportsService {
  constructor(private prisma: PrismaService) {}

  async list(q: ListExportDto) {
    const where: Prisma.StockExportWhereInput = {
      ...(q.status ? { status: q.status } : {}), ...(q.exportType ? { exportType: q.exportType } : {}),
      ...(q.from || q.to ? { exportDate: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } } : {}),
    };
    const [data, totalItems] = await Promise.all([
      this.prisma.stockExport.findMany({ where, include: { createdBy: { select: { name: true } }, items: { include: { product: true } } }, orderBy: { exportDate: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.stockExport.count({ where }),
    ]);
    return { data, pagination: toPagination(q.page, q.pageSize, totalItems) };
  }
  get(id: string) { return this.prisma.stockExport.findUnique({ where: { id }, include: { items: { include: { product: true } }, createdBy: { select: { name: true } } } }); }

  async create(dto: CreateExportDto, userId: string) {
    const code = await this.nextCode('PX');
    const totalRevenue = dto.exportType === ExportType.SALE ? roundMoney(dto.items.reduce((s, i) => s + sumLineAmount(i.quantity, i.unitPrice), 0)) : 0;
    return this.prisma.stockExport.create({ data: { code, exportDate: new Date(dto.exportDate), exportType: dto.exportType, note: dto.note, createdById: userId, totalRevenue, items: { create: dto.items.map(i => ({ productId: i.productId, quantity: i.quantity, salePrice: i.unitPrice, revenueAmount: dto.exportType === ExportType.SALE ? sumLineAmount(i.quantity, i.unitPrice) : 0 })) } }, include: { items: true } });
  }

  async update(id: string, dto: CreateExportDto) {
    const voucher = await this.prisma.stockExport.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu xuất');
    if (voucher.status !== VoucherStatus.DRAFT) throw new ConflictException('Chỉ được sửa phiếu nháp');
    const totalRevenue = dto.exportType === ExportType.SALE ? roundMoney(dto.items.reduce((s, i) => s + sumLineAmount(i.quantity, i.unitPrice), 0)) : 0;
    return this.prisma.$transaction(async tx => {
      await tx.stockExportItem.deleteMany({ where: { stockExportId: id } });
      return tx.stockExport.update({ where: { id }, data: { exportDate: new Date(dto.exportDate), exportType: dto.exportType, note: dto.note, totalRevenue, items: { create: dto.items.map(i => ({ productId: i.productId, quantity: i.quantity, salePrice: i.unitPrice, revenueAmount: dto.exportType === ExportType.SALE ? sumLineAmount(i.quantity, i.unitPrice) : 0 })) } }, include: { items: true } });
    });
  }

  async confirm(id: string, userId: string) {
    const voucher = await this.prisma.stockExport.findUnique({ where: { id }, include: { items: true } });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu xuất');
    if (voucher.status !== VoucherStatus.DRAFT) throw new ConflictException('Phiếu xuất không còn ở trạng thái nháp');
    if (voucher.items.length === 0) throw new BadRequestException('Phiếu xuất chưa có hàng hoá');

    return this.prisma.$transaction(async tx => {
      const requestedByProduct = new Map<string, number>();
      for (const item of voucher.items) requestedByProduct.set(item.productId, roundQty((requestedByProduct.get(item.productId) ?? 0) + Number(item.quantity)));
      const products = await tx.product.findMany({ where: { id: { in: [...requestedByProduct.keys()] } } });
      for (const product of products) assertCanExport(product.name, Number(product.currentStock), requestedByProduct.get(product.id) ?? 0);
      if (products.length !== requestedByProduct.size) throw new NotFoundException('Có hàng hoá không tồn tại');

      let totalRevenue = 0, totalCost = 0;
      for (const item of voucher.items) {
        const product = products.find(p => p.id === item.productId)!;
        const oldStock = Number(product.currentStock);
        const qty = Number(item.quantity);
        const costPrice = Number(product.averageCost);
        const revenue = voucher.exportType === ExportType.SALE ? sumLineAmount(qty, Number(item.salePrice)) : 0;
        const cost = sumLineAmount(qty, costPrice);
        totalRevenue += revenue; totalCost += cost;
        await tx.stockExportItem.update({ where: { id: item.id }, data: { costPrice, revenueAmount: revenue, costAmount: cost, profitAmount: voucher.exportType === ExportType.SALE ? roundMoney(revenue - cost) : 0 } });
        const nextStock = roundQty(oldStock - qty);
        product.currentStock = new Prisma.Decimal(nextStock);
        await tx.product.update({ where: { id: product.id }, data: { currentStock: nextStock } });
        await tx.stockMovement.create({ data: { productId: product.id, movementType: 'EXPORT', referenceType: 'StockExport', referenceId: voucher.id, quantityChange: -qty, stockBefore: oldStock, stockAfter: nextStock, costPrice, createdById: userId, note: voucher.code } });
      }
      return tx.stockExport.update({ where: { id }, data: { status: VoucherStatus.CONFIRMED, confirmedAt: new Date(), confirmedById: userId, totalRevenue: roundMoney(totalRevenue), totalCost: roundMoney(totalCost), totalProfit: voucher.exportType === ExportType.SALE ? roundMoney(totalRevenue - totalCost) : 0 }, include: { items: { include: { product: true } } } });
    });
  }

  async cancel(id: string) {
    const voucher = await this.prisma.stockExport.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu xuất');
    if (voucher.status !== VoucherStatus.DRAFT) throw new ConflictException('V1 chỉ huỷ phiếu nháp; phiếu đã xác nhận cần phiếu điều chỉnh riêng');
    return this.prisma.stockExport.update({ where: { id }, data: { status: VoucherStatus.CANCELLED, cancelledAt: new Date() } });
  }

  async exportMonthlyExcel(q: ExportExcelDto) {
    const from = new Date(Date.UTC(q.year, q.month - 1, 1));
    const to = new Date(Date.UTC(q.year, q.month, 1));
    const rows = await this.prisma.stockExportItem.findMany({ where: { stockExport: { status: VoucherStatus.CONFIRMED, exportDate: { gte: from, lt: to } } }, include: { product: true, stockExport: { include: { createdBy: { select: { name: true } } } } }, orderBy: { stockExport: { exportDate: 'asc' } } });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Phieu xuat chi tiet');
    sheet.columns = [
      { header: 'Mã phiếu', key: 'code', width: 18 }, { header: 'Ngày xuất', key: 'date', width: 16 }, { header: 'Loại', key: 'type', width: 14 }, { header: 'Người tạo', key: 'user', width: 20 },
      { header: 'Mã hàng', key: 'productCode', width: 16 }, { header: 'Tên hàng', key: 'productName', width: 28 }, { header: 'Số lượng', key: 'qty', width: 12 }, { header: 'Giá bán', key: 'sale', width: 14 },
      { header: 'Giá vốn', key: 'cost', width: 14 }, { header: 'Thành tiền bán', key: 'revenue', width: 16 }, { header: 'Thành tiền vốn', key: 'costAmount', width: 16 }, { header: 'Lợi nhuận', key: 'profit', width: 16 },
    ];
    rows.forEach(r => sheet.addRow({ code: r.stockExport.code, date: r.stockExport.exportDate.toISOString().slice(0,10), type: r.stockExport.exportType, user: r.stockExport.createdBy.name, productCode: r.product.code, productName: r.product.name, qty: Number(r.quantity), sale: Number(r.salePrice), cost: Number(r.costPrice), revenue: Number(r.revenueAmount), costAmount: Number(r.costAmount), profit: Number(r.profitAmount) }));
    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return new StreamableFile(Buffer.from(buffer), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', disposition: `attachment; filename=phieu-xuat-${q.year}-${String(q.month).padStart(2,'0')}.xlsx` });
  }

  private async nextCode(prefix: string) { return `${prefix}${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-6)}`; }
}
