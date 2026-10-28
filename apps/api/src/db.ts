import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './config/env.js';
import { PrismaClient, type Prisma } from './generated/prisma/client.js';

/** The single Prisma client for this process. Connects lazily on first query. */
export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

/** Either the root client or the client inside `db.$transaction(async (tx) => …)`. */
export type DbClient = PrismaClient | Prisma.TransactionClient;
