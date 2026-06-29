/**
 * ------------------------------------------------------------------
 * File: prisma.config.ts
 * Description: Prisma CLI configuration for the Norm8 database layer.
 * Responsibilities:
 * - Load environment variables from .env before Prisma resolves them.
 * - Point Prisma to the schema file used by the application.
 * - Resolve the PostgreSQL connection string from the runtime environment.
 * ------------------------------------------------------------------
 */

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});