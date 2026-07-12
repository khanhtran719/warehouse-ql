import { Injectable } from '@nestjs/common';
import { ExportType, Prisma, VoucherStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async overview(fromText: string, toText: string) {
    const range = this.toDateRange(fromText, toText);
    const [importSummary, exportSummary, lowStock, topProducts] = await Promise.all([
      this.getImportSummary(range),
      this.getExportSummary(range),
      this.findLowStockProducts(),
      this.getTopProducts(range),
    ]);

    const productMap = await this.getProductMap(topProducts.map((product) => product.productId));

    return {
      totalImport: Number(importSummary._sum.totalAmount ?? 0),
      importCount: importSummary._count,
      totalRevenue: Number(exportSummary._sum.totalRevenue ?? 0),
      totalCost: Number(exportSummary._sum.totalCost ?? 0),
      totalProfit: Number(exportSummary._sum.totalProfit ?? 0),
      exportCount: exportSummary._count,
      lowStock,
      topProducts: topProducts.map((product) => ({
        product: productMap.get(product.productId),
        quantity: Number(product._sum.quantity ?? 0),
        revenue: Number(product._sum.revenueAmount ?? 0),
        profit: Number(product._sum.profitAmount ?? 0),
      })),
    };
  }

  async daily(fromText: string, toText: string) {
    const range = this.toDateRange(fromText, toText);
    const rows = await this.prisma.stockExport.findMany({
      where: this.confirmedSaleExportWhere(range),
      select: { confirmedAt: true, totalRevenue: true, totalCost: true, totalProfit: true },
      orderBy: { confirmedAt: 'asc' },
    });

    const dailyTotals = new Map<string, { date: string; revenue: number; cost: number; profit: number }>();

    for (const row of rows) {
      const date = (row.confirmedAt ?? new Date()).toISOString().slice(0, 10);
      const current = dailyTotals.get(date) ?? { date, revenue: 0, cost: 0, profit: 0 };
      current.revenue += Number(row.totalRevenue);
      current.cost += Number(row.totalCost);
      current.profit += Number(row.totalProfit);
      dailyTotals.set(date, current);
    }

    return [...dailyTotals.values()];
  }

  private toDateRange(fromText: string, toText: string) {
    return { from: new Date(fromText), to: new Date(toText) };
  }

  private getImportSummary(range: DateRange) {
    return this.prisma.stockImport.aggregate({
      where: { status: VoucherStatus.CONFIRMED, confirmedAt: { gte: range.from, lte: range.to } },
      _sum: { totalAmount: true },
      _count: true,
    });
  }

  private getExportSummary(range: DateRange) {
    return this.prisma.stockExport.aggregate({
      where: this.confirmedSaleExportWhere(range),
      _sum: { totalRevenue: true, totalCost: true, totalProfit: true },
      _count: true,
    });
  }

  private getTopProducts(range: DateRange) {
    return this.prisma.stockExportItem.groupBy({
      by: ['productId'],
      where: { stockExport: this.confirmedSaleExportWhere(range) },
      _sum: { quantity: true, revenueAmount: true, profitAmount: true },
      orderBy: { _sum: { revenueAmount: 'desc' } },
      take: 10,
    });
  }

  private async getProductMap(productIds: string[]) {
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    return new Map(products.map((product) => [product.id, product]));
  }

  private async findLowStockProducts() {
    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        currentStock: { lte: this.prisma.product.fields.minStock },
      },
      orderBy: { currentStock: 'asc' },
      take: 10,
    });
  }

  private confirmedSaleExportWhere(range: DateRange): Prisma.StockExportWhereInput {
    return {
      status: VoucherStatus.CONFIRMED,
      exportType: ExportType.SALE,
      confirmedAt: { gte: range.from, lte: range.to },
    };
  }
}

type DateRange = {
  from: Date;
  to: Date;
};
