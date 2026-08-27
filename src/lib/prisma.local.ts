import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Local development Prisma client (Node.js + SQLite). Used when
// `prepare-platform.mjs` detects a non-cloudflare target (i.e. `npm run dev`
// with Turbopack). The Cloudflare version (prisma.cloudflare.ts) uses the D1
// adapter and getCloudflareContext(), which only exists inside workerd.
//
// Prisma 7 requires a driver adapter; we use better-sqlite3 for local dev.
// We reuse a single client per process to avoid exhausting SQLite connections
// during hot-reload cycles.
const globalForPrisma = globalThis as unknown as {
  __prismaClientLocal?: PrismaClient;
};

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma =
  globalForPrisma.__prismaClientLocal ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prismaClientLocal = prisma;
}
