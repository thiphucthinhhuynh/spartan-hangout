import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Applies migrations to the test database once before any test file runs.
    globalSetup: ['test/globalSetup.ts'],
    // Integration tests share one test database, so run test files one at a time.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      // Tests must never touch the development database.
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? '',
    },
  },
});
