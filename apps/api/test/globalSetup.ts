import { execFileSync } from 'node:child_process';

/** Brings the test database schema up to date before the test run (roadmap task 16). */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('DATABASE_URL_TEST is not set. Copy apps/api/.env.example to apps/api/.env.');
  }
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
