import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@/generated/prisma/neon';

const rawUrl = process.env.DATABASE_URL?.trim();
if (!rawUrl) {
  throw new Error('DATABASE_URL is required when deploying to Vercel/Neon');
}

// Local dev convenience: when DATABASE_URL points at a SQLite file
// (e.g. "file:./prisma/dev.db"), use the better-sqlite3 adapter against the
// canonical SQLite schema instead of requiring a live Neon instance. This only
// activates for `file:` URLs — production keeps using the Neon adapter.
const isLocalSqlite = rawUrl.startsWith('file:');

const globalForPrisma = globalThis as unknown as {
  prismaNeon?: PrismaClient;
  prismaSqlite?: PrismaClient;
};

let prisma: PrismaClient;

if (isLocalSqlite) {
  // Hide the dev-only SQLite dependency from the production bundler by using
  // eval('require'). The bundler cannot statically trace this specifier, so
  // @prisma/adapter-better-sqlite3 is never included in production chunks.
  // The module is only loaded at runtime when DATABASE_URL is a local file path.
  const dynamicRequire = eval('require') as NodeRequire;
  const { PrismaBetterSqlite3 } = dynamicRequire('@prisma/adapter-better-sqlite3');
  const { PrismaClient: SqliteClient } = dynamicRequire('@prisma/client');
  const filePath = rawUrl.replace(/^file:/, '');
  const client =
    globalForPrisma.prismaSqlite ??
    (new SqliteClient({ adapter: new PrismaBetterSqlite3({ url: filePath }) }) as unknown as PrismaClient);
  globalForPrisma.prismaSqlite = client;
  prisma = client;
} else {
  const client =
    globalForPrisma.prismaNeon ??
    new PrismaClient({ adapter: new PrismaNeon({ connectionString: rawUrl }) });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaNeon = client;
  prisma = client;
}

export { prisma };
