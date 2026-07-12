import { BadRequestException, ConflictException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExportType, Prisma, Product, StockExport, StockExportItem, VoucherStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPagination } from '../common/pagination.dto';
import { CreateExportDto, ExportExcelDto, ListExportDto, VoucherItemDto } from './dto';
import { assertCanExport, roundMoney, roundQty, sumLineAmount } from './inventory-math';
import { generateVoucherCode } from './voucher-code';
import { buildDeliveryWorkbook, deliveryFileName, readDeliveryCompanyProfile } from './delivery-workbook';
import { buildMonthlyExportWorkbook } from './monthly-export-workbook';

@Injectable()
export class StockExportsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async list(query: ListExportDto) {
    const where = this.buildWhere(query);

    const [data, totalItems] = await Promise.all([
      this.prisma.stockExport.findMany({
        where,
        include: {
          createdBy: { select: { name: true } },
          items: { include: { product: true } },
        },
        orderBy: { exportDate: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.stockExport.count({ where }),
    ]);

    return {
      data,
      pagination: toPagination(query.page, query.pageSize, totalItems),
    };
  }

  get(id: string) {
    return this.prisma.stockExport.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        createdBy: { select: { name: true } },
      },
    });
  }

  async create(dto: CreateExportDto, userId: string) {
    const code = generateVoucherCode('PX');
    const totalRevenue = this.calculateRevenue(dto.exportType, dto.items);
    const customer = await this.resolveCustomer(dto);

    return this.prisma.stockExport.create({
      data: {
        code,
        exportDate: new Date(dto.exportDate),
        exportType: dto.exportType,
        ...customer,
        note: dto.note,
        createdById: userId,
        totalRevenue,
        items: {
          create: this.toExportItemCreates(dto.exportType, dto.items),
        },
      },
      include: this.deliveryVoucherInclude(),
    });
  }

  async update(id: string, dto: CreateExportDto) {
    return this.prisma.$transaction(async (tx) => {
      const existingVoucher = await this.findLockedVoucherOrThrow(tx, id);
      this.ensureDraft(existingVoucher, 'Chỉ được sửa phiếu nháp');
      const customer = await this.resolveCustomer(dto, tx);

      await tx.stockExportItem.deleteMany({ where: { stockExportId: id } });
      const updatedVoucher = await tx.stockExport.update({
        where: { id },
        data: {
          exportDate: new Date(dto.exportDate),
          exportType: dto.exportType,
          ...customer,
          note: dto.note,
          totalRevenue: this.calculateRevenue(dto.exportType, dto.items),
          items: {
            create: this.toExportItemCreates(dto.exportType, dto.items),
          },
        },
        include: this.deliveryVoucherInclude(),
      });

      return updatedVoucher;
    });
  }

  async confirm(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const voucher = await this.findLockedVoucherWithItemsOrThrow(tx, id);
      this.ensureDraft(voucher);
      if (voucher.items.length === 0) throw new BadRequestException('Phiếu xuất chưa có hàng hoá');

      const requestedByProduct = this.sumRequestedQuantityByProduct(voucher.items);
      await this.lockProducts(tx, [...requestedByProduct.keys()]);

      const products = await this.findProductsOrThrow(tx, requestedByProduct);
      const productState = this.validateAndBuildProductState(products, requestedByProduct);
      const totals = { revenue: 0, cost: 0 };

      for (const item of voucher.items) {
        const itemTotals = await this.applyExportItem(tx, voucher, item, productState, userId);
        totals.revenue += itemTotals.revenue;
        totals.cost += itemTotals.cost;
      }

      return tx.stockExport.update({
        where: { id },
        data: {
          status: VoucherStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedById: userId,
          totalRevenue: roundMoney(totals.revenue),
          totalCost: roundMoney(totals.cost),
          totalProfit: voucher.exportType === ExportType.SALE ? roundMoney(totals.revenue - totals.cost) : 0,
        },
        include: { items: { include: { product: true } } },
      });
    });
  }

  async cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const voucher = await this.findLockedVoucherOrThrow(tx, id);
      this.ensureDraft(voucher, 'V1 chỉ huỷ phiếu nháp; phiếu đã xác nhận cần phiếu điều chỉnh riêng');

      return tx.stockExport.update({
        where: { id },
        data: { status: VoucherStatus.CANCELLED, cancelledAt: new Date() },
      });
    });
  }

  async exportMonthlyExcel(query: ExportExcelDto) {
    const from = new Date(Date.UTC(query.year, query.month - 1, 1));
    const to = new Date(Date.UTC(query.year, query.month, 1));
    const rows = await this.findMonthlyExportRows(from, to);
    const workbook = buildMonthlyExportWorkbook(rows);
    const buffer = await workbook.xlsx.writeBuffer();

    return new StreamableFile(Buffer.from(buffer), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename=phieu-xuat-${query.year}-${String(query.month).padStart(2, '0')}.xlsx`,
    });
  }

  async downloadDeliveryFile(id: string) {
    const voucher = await this.findExportForFileOrThrow(id);
    if (voucher.status === VoucherStatus.CANCELLED) {
      throw new ConflictException('Không thể tải phiếu giao hàng đã huỷ');
    }
    const workbook = buildDeliveryWorkbook(voucher, readDeliveryCompanyProfile(this.config));
    const buffer = await workbook.xlsx.writeBuffer();

    return new StreamableFile(Buffer.from(buffer), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename=${deliveryFileName(voucher.code)}`,
    });
  }

  private buildWhere(query: ListExportDto): Prisma.StockExportWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.exportType ? { exportType: query.exportType } : {}),
      ...(query.from || query.to
        ? {
            exportDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  private async resolveCustomer(dto: CreateExportDto, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    if (!dto.customerId) {
      return {
        customerId: null,
        customerName: dto.customerName?.trim() || null,
        customerAddress: dto.customerAddress?.trim() || null,
        customerPhone: dto.customerPhone?.trim() || null,
        customerTaxCode: dto.customerTaxCode?.trim() || null,
      };
    }

    const customer = await client.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');
    if (customer.status !== 'ACTIVE') throw new ConflictException('Khách hàng đã ngừng hoạt động');
    return {
      customerId: customer.id,
      customerName: customer.name,
      customerAddress: customer.address,
      customerPhone: customer.phone,
      customerTaxCode: customer.taxCode,
    };
  }

  private calculateRevenue(exportType: ExportType, items: VoucherItemDto[]) {
    if (exportType !== ExportType.SALE) return 0;
    return roundMoney(items.reduce((sum, item) => sum + sumLineAmount(item.quantity, item.unitPrice), 0));
  }

  private toExportItemCreates(exportType: ExportType, items: VoucherItemDto[]) {
    return items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      salePrice: item.unitPrice,
      revenueAmount: exportType === ExportType.SALE ? sumLineAmount(item.quantity, item.unitPrice) : 0,
    }));
  }

  private sumRequestedQuantityByProduct(items: StockExportItem[]) {
    const requestedByProduct = new Map<string, number>();

    for (const item of items) {
      requestedByProduct.set(
        item.productId,
        roundQty((requestedByProduct.get(item.productId) ?? 0) + Number(item.quantity)),
      );
    }

    return requestedByProduct;
  }

  private async findProductsOrThrow(tx: Prisma.TransactionClient, requestedByProduct: Map<string, number>) {
    const products = await tx.product.findMany({
      where: { id: { in: [...requestedByProduct.keys()] } },
    });
    if (products.length !== requestedByProduct.size) throw new NotFoundException('Có hàng hoá không tồn tại');
    return products;
  }

  private validateAndBuildProductState(products: Product[], requestedByProduct: Map<string, number>) {
    const productState = new Map<string, { product: Product; currentStock: number }>();

    for (const product of products) {
      const requestedQuantity = requestedByProduct.get(product.id) ?? 0;
      try {
        assertCanExport(product.name, Number(product.currentStock), requestedQuantity);
      } catch (error) {
        throw new ConflictException(error instanceof Error ? error.message : 'Không đủ tồn kho');
      }
      productState.set(product.id, {
        product,
        currentStock: Number(product.currentStock),
      });
    }

    return productState;
  }

  private async applyExportItem(
    tx: Prisma.TransactionClient,
    voucher: StockExport,
    item: StockExportItem,
    productState: Map<string, { product: Product; currentStock: number }>,
    userId: string,
  ) {
    const state = productState.get(item.productId);
    if (!state) throw new NotFoundException('Có hàng hoá không tồn tại');

    const quantity = Number(item.quantity);
    const oldStock = state.currentStock;
    const nextStock = roundQty(oldStock - quantity);
    const costPrice = Number(state.product.averageCost);
    const revenue = voucher.exportType === ExportType.SALE ? sumLineAmount(quantity, Number(item.salePrice)) : 0;
    const cost = sumLineAmount(quantity, costPrice);

    await tx.stockExportItem.update({
      where: { id: item.id },
      data: {
        costPrice,
        revenueAmount: revenue,
        costAmount: cost,
        profitAmount: voucher.exportType === ExportType.SALE ? roundMoney(revenue - cost) : 0,
      },
    });
    await tx.product.update({
      where: { id: state.product.id },
      data: { currentStock: nextStock },
    });
    await tx.stockMovement.create({
      data: {
        productId: state.product.id,
        movementType: 'EXPORT',
        referenceType: 'StockExport',
        referenceId: voucher.id,
        quantityChange: -quantity,
        stockBefore: oldStock,
        stockAfter: nextStock,
        costPrice,
        createdById: userId,
        note: voucher.code,
      },
    });

    state.currentStock = nextStock;
    return { revenue, cost };
  }

  private findMonthlyExportRows(from: Date, to: Date) {
    return this.prisma.stockExportItem.findMany({
      where: {
        stockExport: {
          status: VoucherStatus.CONFIRMED,
          confirmedAt: { gte: from, lt: to },
        },
      },
      include: {
        product: true,
        stockExport: { include: { createdBy: { select: { name: true } } } },
      },
      orderBy: { stockExport: { confirmedAt: 'asc' } },
    });
  }

  private deliveryVoucherInclude() {
    return {
      createdBy: { select: { name: true } },
      items: { include: { product: { include: { unit: true } } } },
    } satisfies Prisma.StockExportInclude;
  }

  private async findExportForFileOrThrow(id: string) {
    const voucher = await this.prisma.stockExport.findUnique({
      where: { id },
      include: this.deliveryVoucherInclude(),
    });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu xuất');
    return voucher;
  }

  private async findLockedVoucherOrThrow(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "StockExport" WHERE id = ${id} FOR UPDATE`);
    const voucher = await tx.stockExport.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu xuất');
    return voucher;
  }

  private async findLockedVoucherWithItemsOrThrow(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "StockExport" WHERE id = ${id} FOR UPDATE`);
    const voucher = await tx.stockExport.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu xuất');
    return voucher;
  }

  private async lockProducts(tx: Prisma.TransactionClient, productIds: string[]) {
    const uniqueProductIds = [...new Set(productIds)].sort();
    if (uniqueProductIds.length === 0) return;

    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "Product" WHERE id IN (${Prisma.join(uniqueProductIds)}) ORDER BY id FOR UPDATE`,
    );
  }

  private ensureDraft(voucher: StockExport, message = 'Phiếu xuất không còn ở trạng thái nháp') {
    if (voucher.status !== VoucherStatus.DRAFT) {
      throw new ConflictException(message);
    }
  }
}
