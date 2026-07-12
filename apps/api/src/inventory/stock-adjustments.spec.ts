import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { AdjustStockDto } from './stock-adjustments.dto';
import { StockAdjustmentsService } from './stock-adjustments.service';

describe('StockAdjustmentsService', () => {
  it('records an audited movement when an admin corrects physical stock', async () => {
    const updatedProduct = { id: 'product-1', currentStock: 7, averageCost: 50 };
    const movement = { id: 'movement-1', quantityChange: -3, stockBefore: 10, stockAfter: 7 };
    const tx = {
      $queryRaw: vi.fn(),
      product: {
        findUnique: vi.fn().mockResolvedValue({ id: 'product-1', name: 'Hàng A', currentStock: 10, averageCost: 50 }),
        update: vi.fn().mockResolvedValue(updatedProduct),
      },
      stockMovement: { create: vi.fn().mockResolvedValue(movement) },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(tx)) };
    const service = new StockAdjustmentsService(prisma as never);

    const result = await service.adjustProduct('product-1', { targetStock: 7, reason: 'Kiểm kê thực tế' }, 'admin-1');

    expect(result).toEqual({ product: updatedProduct, movement });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'product-1',
        movementType: 'ADJUSTMENT',
        quantityChange: -3,
        stockBefore: 10,
        stockAfter: 7,
        createdById: 'admin-1',
        note: 'Kiểm kê thực tế',
      }),
    });
  });

  it('rejects an adjustment that does not change stock', async () => {
    const tx = {
      $queryRaw: vi.fn(),
      product: { findUnique: vi.fn().mockResolvedValue({ id: 'product-1', currentStock: 10 }) },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(tx)) };
    const service = new StockAdjustmentsService(prisma as never);

    await expect(
      service.adjustProduct('product-1', { targetStock: 10, reason: 'Không thay đổi' }, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects blank reasons and values outside the database numeric range', async () => {
    const blankReason = plainToInstance(AdjustStockDto, { targetStock: 1, reason: '   ' });
    const oversizedStock = plainToInstance(AdjustStockDto, { targetStock: 1_000_000_000_000_000, reason: 'Kiểm kê' });

    expect(await validate(blankReason)).not.toHaveLength(0);
    expect(await validate(oversizedStock)).not.toHaveLength(0);
  });
});
