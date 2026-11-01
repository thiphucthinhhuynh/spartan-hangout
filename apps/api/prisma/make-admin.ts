// Makes an existing, verified account an administrator (open question Q14, roadmap task 121).
// Run with `npm run admin:promote -- someone@sjsu.edu`. Works in production, unlike the seed.
import { existsSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, UserStatus } from '../src/generated/prisma/client.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run admin:promote -- someone@sjsu.edu');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (copy apps/api/.env.example to apps/api/.env).');
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, status: true } });
  if (!user) {
    console.error(`No account uses ${email}. Register it first.`);
    process.exitCode = 1;
    return;
  }
  if (user.status !== UserStatus.ACTIVE) {
    console.error(`${email} hasn't verified its email yet.`);
    process.exitCode = 1;
    return;
  }
  await db.user.update({ where: { id: user.id }, data: { role: Role.ADMIN } });
  console.log(`${email} is now an administrator.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
