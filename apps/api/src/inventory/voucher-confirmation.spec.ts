import { ConflictException } from '@nestjs/common';
import { ExportType, VoucherStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { StockExportsService } from './stock-exports.service';
import { StockImportsService } from './stock-imports.service';

describe('inventory voucher confirmation safety', () => {
  it('re-checks import voucher status inside the transaction before applying stock', async () => {
    const tx = {
      $queryRaw: vi.fn(),
      stockImport: {
        findUnique: vi.fn().mockResolvedValue({ id: 'import-1', status: VoucherStatus.CONFIRMED, items: [] }),
      },
      product: { findUnique: vi.fn(), update: vi.fn() },
      stockMovement: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(tx)) };
    const service = new StockImportsService(prisma as never);

    await expect(service.confirm('import-1', 'user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it('returns a business conflict when an export voucher does not have enough stock', async () => {
    const tx = {
      $queryRaw: vi.fn(),
      stockExport: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'export-1',
          code: 'PX1',
          status: VoucherStatus.DRAFT,
          exportType: ExportType.SALE,
          items: [{ id: 'item-1', productId: 'product-1', quantity: 2, salePrice: 100 }],
        }),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([{ id: 'product-1', name: 'Hàng A', currentStock: 1, averageCost: 50 }]),
        update: vi.fn(),
      },
      stockExportItem: { update: vi.fn() },
      stockMovement: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(tx)) };
    const service = new StockExportsService(prisma as never);

    await expect(service.confirm('export-1', 'user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });
});
