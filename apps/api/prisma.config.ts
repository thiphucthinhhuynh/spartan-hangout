import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// The Prisma CLI does not read .env on its own; load it if present (CI sets real env vars instead).
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Optional for `prisma generate`; required by migrate/seed, which fail with a clear message if unset.
  datasource: { url: process.env.DATABASE_URL },
});
