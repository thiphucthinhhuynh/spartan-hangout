import { existsSync } from 'node:fs';
import { z } from 'zod';

// Local development reads apps/api/.env; variables already set (CI, tests, hosting) win.
if (process.env.NODE_ENV !== 'production' && existsSync('.env')) process.loadEnvFile('.env');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'is required (copy apps/api/.env.example to apps/api/.env)'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
  throw new Error(`Invalid environment variables:\n${problems.join('\n')}`);
}

export const env = parsed.data;
