import { describe, expect, it } from 'vitest';
import { exportTypeLabel, money, qty, statusLabel } from './format';

describe('format helpers', () => {
  it('formats Vietnamese currency and quantity values', () => {
    expect(money(120000)).toContain('120.000');
    expect(qty(1.2345)).toBe('1,235');
  });

  it('maps internal enum labels to Vietnamese labels', () => {
    expect(statusLabel('CONFIRMED')).toBe('Đã xác nhận');
    expect(exportTypeLabel('SALE')).toBe('Bán hàng');
  });
});
