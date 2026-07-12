import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { roundQty } from './inventory-math';
import { generateVoucherCode } from './voucher-code';

@Injectable()
export class StockAdjustmentsService {
  constructor(private prisma: PrismaService) {}

  adjustProduct(productId: string, dto: { targetStock: number; reason: string }, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`);
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Không tìm thấy hàng hoá');

      const stockBefore = roundQty(Number(product.currentStock));
      const stockAfter = roundQty(dto.targetStock);
      const quantityChange = roundQty(stockAfter - stockBefore);
      if (quantityChange === 0) {
        throw new BadRequestException('Tồn điều chỉnh phải khác tồn hiện tại');
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: stockAfter },
        include: { category: true, unit: true },
      });
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          movementType: MovementType.ADJUSTMENT,
          referenceType: 'StockAdjustment',
          referenceId: generateVoucherCode('DC'),
          quantityChange,
          stockBefore,
          stockAfter,
          costPrice: product.averageCost,
          createdById: userId,
          note: dto.reason.trim(),
        },
      });

      return { product: updatedProduct, movement };
    });
  }
}
