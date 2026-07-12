import { Prisma } from '@prisma/client';

export type WeightedAverageInput = { stock: number; averageCost: number; quantity: number; unitPrice: number };

export function weightedAverageCost(input: WeightedAverageInput): number {
  const { stock, averageCost, quantity, unitPrice } = input;
  if (quantity <= 0) throw new Error('Số lượng nhập phải lớn hơn 0');
  const nextStock = decimal(stock).plus(quantity);
  if (nextStock.lte(0)) return 0;
  return decimal(stock)
    .mul(averageCost)
    .plus(decimal(quantity).mul(unitPrice))
    .div(nextStock)
    .toDecimalPlaces(2)
    .toNumber();
}

export function roundMoney(value: number): number {
  return decimal(value).toDecimalPlaces(2).toNumber();
}

export function roundQty(value: number): number {
  return decimal(value).toDecimalPlaces(3).toNumber();
}

export function assertCanExport(productName: string, currentStock: number, requestedQty: number) {
  if (requestedQty <= 0) throw new Error('Số lượng xuất phải lớn hơn 0');
  if (currentStock < requestedQty) {
    throw new Error(`Không đủ tồn kho cho ${productName}. Tồn: ${currentStock}, cần xuất: ${requestedQty}`);
  }
}

export function sumLineAmount(quantity: number, price: number): number {
  return decimal(quantity).mul(price).toDecimalPlaces(2).toNumber();
}

function decimal(value: number | Prisma.Decimal) {
  return new Prisma.Decimal(value);
}
