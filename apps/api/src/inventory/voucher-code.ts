import { randomBytes } from 'node:crypto';

export function generateVoucherCode(prefix: string, date = new Date()) {
  const day = date.toISOString().slice(0, 10).replace(/-/g, '');
  const entropy = randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}${day}-${entropy}`;
}
