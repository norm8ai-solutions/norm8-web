/**
 * ------------------------------------------------------------------
 * File: lib/db/prisma.ts
 * Description: Shared Prisma Client instance for server-side database access.
 * Responsibilities:
 * - Create a single Prisma Client per Node.js process in development.
 * - Expose a typed database client for services and server actions.
 * - Keep database access out of React components.
 * ------------------------------------------------------------------
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/app/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Shared Prisma Client instance.
 *
 * Next.js development mode can reload modules frequently. Reusing the client
 * through globalThis prevents connection exhaustion while preserving a fresh
 * client per process in production.
 */
const adapter = new PrismaPg(process.env.DATABASE_URL ?? '');

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
