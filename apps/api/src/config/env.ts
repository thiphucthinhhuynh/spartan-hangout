import { existsSync } from 'node:fs';
import { z } from 'zod';

// Local development reads apps/api/.env; variables already set (CI, tests, hosting) win.
if (process.env.NODE_ENV !== 'production' && existsSync('.env')) process.loadEnvFile('.env');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'is required (copy apps/api/.env.example to apps/api/.env)'),
    /** Public URL of the web app; used to build links in emails. */
    APP_ORIGIN: z.url().default('http://localhost:5173'),
    /** SMTP settings. When SMTP_HOST is empty, emails are printed to the console instead. */
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default('Spartan Hangout <no-reply@spartanhangout.local>'),
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.SMTP_HOST), {
    error: 'is required in production (verification emails must really be sent)',
    path: ['SMTP_HOST'],
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
  throw new Error(`Invalid environment variables:\n${problems.join('\n')}`);
}

export const env = parsed.data;
