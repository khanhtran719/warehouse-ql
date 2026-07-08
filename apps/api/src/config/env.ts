import { ConfigService } from '@nestjs/config';

type Env = Record<string, string | undefined>;

const REQUIRED_KEYS = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN'] as const;
const UNSAFE_PRODUCTION_VALUES = new Set(['dev-secret', 'change-me-in-production', 'change-me']);

export function validateEnv(config: Env) {
  for (const key of REQUIRED_KEYS) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (config.NODE_ENV === 'production' && UNSAFE_PRODUCTION_VALUES.has(config.JWT_SECRET ?? '')) {
    throw new Error('JWT_SECRET must be changed before running in production');
  }

  return config;
}

export function getRequiredConfig(config: ConfigService, key: string) {
  const value = config.get<string>(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
