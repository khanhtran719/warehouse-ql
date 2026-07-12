import { describe, expect, it } from 'vitest';
import { validateEnv } from './env';

const deliveryConfig = {
  DELIVERY_COMPANY_NAME: 'Warehouse Test',
  DELIVERY_COMPANY_ADDRESS: 'Test address',
  DELIVERY_COMPANY_PHONE: '0900000000',
  DELIVERY_BANK_ACCOUNT: '123456',
  DELIVERY_BANK_ACCOUNT_NAME: 'Warehouse Test',
  DELIVERY_BANK_NAME: 'Test Bank',
};

describe('validateEnv', () => {
  it('requires critical runtime configuration', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL');
  });

  it('rejects placeholder JWT secrets in production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://example',
        JWT_SECRET: 'change-me-in-production',
        CORS_ORIGIN: 'https://warehouse.example.com',
        ...deliveryConfig,
      }),
    ).toThrow('JWT_SECRET');
  });

  it('rejects the Docker development JWT secret in production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://example',
        JWT_SECRET: 'local-docker-jwt-secret-change-before-production',
        CORS_ORIGIN: 'https://warehouse.example.com',
        ...deliveryConfig,
      }),
    ).toThrow('JWT_SECRET');
  });

  it('allows local development configuration', () => {
    expect(
      validateEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://example',
        JWT_SECRET: 'change-me-in-production',
        CORS_ORIGIN: 'http://localhost:5173',
        ...deliveryConfig,
      }),
    ).toMatchObject({ NODE_ENV: 'development' });
  });

  it('requires the delivery company profile used by exported vouchers', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://example',
        JWT_SECRET: 'local-secret',
        CORS_ORIGIN: 'http://localhost:5173',
      }),
    ).toThrow('DELIVERY_COMPANY_NAME');
  });
});
