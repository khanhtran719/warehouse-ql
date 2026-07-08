import { describe, expect, it } from 'vitest';
import { validateEnv } from './env';

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
      }),
    ).toMatchObject({ NODE_ENV: 'development' });
  });
});
