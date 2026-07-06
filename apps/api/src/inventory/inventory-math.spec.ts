import { describe, expect, it } from 'vitest';
import { assertCanExport, sumLineAmount, weightedAverageCost } from './inventory-math';

describe('inventory math', () => {
  it('calculates weighted average cost after import', () => {
    expect(weightedAverageCost({ stock: 10, averageCost: 100, quantity: 5, unitPrice: 160 })).toBe(120);
  });
  it('uses imported unit price when old stock is zero', () => {
    expect(weightedAverageCost({ stock: 0, averageCost: 0, quantity: 3, unitPrice: 12500 })).toBe(12500);
  });
  it('rejects export beyond current stock', () => {
    expect(() => assertCanExport('A', 2, 3)).toThrow('Không đủ tồn kho');
  });
  it('rounds line amounts as currency', () => {
    expect(sumLineAmount(3, 10.236)).toBe(30.71);
  });
});
