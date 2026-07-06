import { Injectable } from '@nestjs/common';
import { ExportType, VoucherStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}
  async overview(fromText: string, toText: string) {
    const from = new Date(fromText); const to = new Date(toText);
    const [imports, exports, lowStock, topProducts] = await Promise.all([
      this.prisma.stockImport.aggregate({ where: { status: VoucherStatus.CONFIRMED, confirmedAt: { gte: from, lte: to } }, _sum: { totalAmount: true }, _count: true }),
      this.prisma.stockExport.aggregate({ where: { status: VoucherStatus.CONFIRMED, exportType: ExportType.SALE, confirmedAt: { gte: from, lte: to } }, _sum: { totalRevenue: true, totalCost: true, totalProfit: true }, _count: true }),
      this.findLowStockProducts(),
      this.prisma.stockExportItem.groupBy({ by: ['productId'], where: { stockExport: { status: VoucherStatus.CONFIRMED, exportType: ExportType.SALE, confirmedAt: { gte: from, lte: to } } }, _sum: { quantity: true, revenueAmount: true, profitAmount: true }, orderBy: { _sum: { revenueAmount: 'desc' } }, take: 10 }),
    ]);
    const productMap = new Map((await this.prisma.product.findMany({ where: { id: { in: topProducts.map(p => p.productId) } } })).map(p => [p.id, p]));
    return {
      totalImport: Number(imports._sum.totalAmount ?? 0), importCount: imports._count,
      totalRevenue: Number(exports._sum.totalRevenue ?? 0), totalCost: Number(exports._sum.totalCost ?? 0), totalProfit: Number(exports._sum.totalProfit ?? 0), exportCount: exports._count,
      lowStock,
      topProducts: topProducts.map(p => ({ product: productMap.get(p.productId), quantity: Number(p._sum.quantity ?? 0), revenue: Number(p._sum.revenueAmount ?? 0), profit: Number(p._sum.profitAmount ?? 0) })),
    };
  }

  async daily(fromText: string, toText: string) {
    const from = new Date(fromText); const to = new Date(toText);
    const rows = await this.prisma.stockExport.findMany({ where: { status: VoucherStatus.CONFIRMED, exportType: ExportType.SALE, confirmedAt: { gte: from, lte: to } }, select: { confirmedAt: true, totalRevenue: true, totalCost: true, totalProfit: true }, orderBy: { confirmedAt: 'asc' } });
    const map = new Map<string, { date: string; revenue: number; cost: number; profit: number }>();
    rows.forEach(r => { const date = (r.confirmedAt ?? new Date()).toISOString().slice(0,10); const item = map.get(date) ?? { date, revenue: 0, cost: 0, profit: 0 }; item.revenue += Number(r.totalRevenue); item.cost += Number(r.totalCost); item.profit += Number(r.totalProfit); map.set(date, item); });
    return [...map.values()];
  }

  private async findLowStockProducts() {
    const products = await this.prisma.product.findMany({ where: { status: 'ACTIVE' }, orderBy: { updatedAt: 'desc' }, take: 500 });
    return products
      .filter(product => Number(product.currentStock) <= Number(product.minStock))
      .sort((a, b) => Number(a.currentStock) - Number(b.currentStock))
      .slice(0, 10);
  }
}
