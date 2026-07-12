import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VoucherForm } from './VoucherForm';

describe('VoucherForm', () => {
  it('renders line items without spreading duplicate React keys into form controls', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<VoucherForm mode="import" products={[]} onSubmit={vi.fn()} />);

    const keyWarnings = consoleError.mock.calls.filter((call) => String(call[0]).includes('key'));
    expect(keyWarnings).toHaveLength(0);
    consoleError.mockRestore();
  });
});
