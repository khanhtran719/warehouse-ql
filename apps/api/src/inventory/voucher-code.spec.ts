import { describe, expect, it, vi } from 'vitest';
import { generateVoucherCode } from './voucher-code';

describe('generateVoucherCode', () => {
  it('keeps voucher codes unique when many codes are generated at the same time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T08:00:00.000Z'));

    const codes = Array.from({ length: 100 }, () => generateVoucherCode('PX'));

    expect(new Set(codes).size).toBe(100);
    expect(codes.every((code) => /^PX20260711-[A-F0-9]{16}$/.test(code))).toBe(true);
    vi.useRealTimers();
  });
});
