import { describe, expect, it, vi } from 'vitest';
import { ReportsService } from './reports.service';

describe('ReportsService low-stock query', () => {
  it('filters current stock against min stock in PostgreSQL instead of truncating an in-memory list', async () => {
    const minStockField = { modelName: 'Product', name: 'minStock' };
    const lowStock = [{ id: 'product-1', currentStock: 1, minStock: 5 }];
    const prisma = {
      product: {
        fields: { minStock: minStockField },
        findMany: vi.fn().mockResolvedValue(lowStock),
      },
    };
    const service = new ReportsService(prisma as never);

    const result = await (service as any).findLowStockProducts();

    expect(result).toEqual(lowStock);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', currentStock: { lte: minStockField } },
      orderBy: { currentStock: 'asc' },
      take: 10,
    });
  });
});
