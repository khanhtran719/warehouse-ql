import { describe, expect, it } from 'vitest';
import { validateReceiptImage } from './import-attachments.service';

describe('validateReceiptImage', () => {
  it('accepts supported receipt image formats within the size limit', () => {
    expect(() =>
      validateReceiptImage({ mimetype: 'image/jpeg', size: 1024, buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]) }),
    ).not.toThrow();
    expect(() =>
      validateReceiptImage({
        mimetype: 'image/png',
        size: 8 * 1024 * 1024,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      }),
    ).not.toThrow();
  });

  it('rejects unsupported files and images larger than 8 MB', () => {
    expect(() =>
      validateReceiptImage({ mimetype: 'application/pdf', size: 1024, buffer: Buffer.from('%PDF') }),
    ).toThrow('JPEG, PNG hoặc WebP');
    expect(() =>
      validateReceiptImage({ mimetype: 'image/webp', size: 8 * 1024 * 1024 + 1, buffer: Buffer.from('RIFF0000WEBP') }),
    ).toThrow('8 MB');
  });

  it('rejects a file whose content does not match its declared image format', () => {
    expect(() =>
      validateReceiptImage({ mimetype: 'image/png', size: 100, buffer: Buffer.from('not-a-real-image') }),
    ).toThrow('không hợp lệ');
  });
});
