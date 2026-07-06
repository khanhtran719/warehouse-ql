export type WeightedAverageInput = { stock: number; averageCost: number; quantity: number; unitPrice: number };

export function weightedAverageCost(input: WeightedAverageInput): number {
  const { stock, averageCost, quantity, unitPrice } = input;
  if (quantity <= 0) throw new Error('Số lượng nhập phải lớn hơn 0');
  const nextStock = stock + quantity;
  if (nextStock <= 0) return 0;
  return roundMoney(((stock * averageCost) + (quantity * unitPrice)) / nextStock);
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function roundQty(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}

export function assertCanExport(productName: string, currentStock: number, requestedQty: number) {
  if (requestedQty <= 0) throw new Error('Số lượng xuất phải lớn hơn 0');
  if (currentStock < requestedQty) {
    throw new Error(`Không đủ tồn kho cho ${productName}. Tồn: ${currentStock}, cần xuất: ${requestedQty}`);
  }
}

export function sumLineAmount(quantity: number, price: number): number {
  return roundMoney(quantity * price);
}
