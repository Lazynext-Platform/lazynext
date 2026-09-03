/**
 * Seed the test account for E2E tests.
 * Creates test@lazynext.local with password Test1234! and 150 credits.
 * Idempotent — safe to run multiple times.
 *
 * SAFETY: This script refuses to run in production or against a non-SQLite
 * database to prevent creating a known-credential admin backdoor.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

// Refuse to run in production or against a non-SQLite database
if (process.env.NODE_ENV === 'production' || process.env.BUILD_TARGET === 'cloudflare') {
  console.error('[seed-test-user] Refusing to seed test account in production. Aborting.');
  process.exit(1);
}
if (!dbUrl.startsWith('file:')) {
  console.error(`[seed-test-user] Refusing to seed against non-SQLite database: ${dbUrl}. Aborting.`);
  process.exit(1);
}

const adapter = new PrismaBetterSqlite3({ url: dbUrl });

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'test@lazynext.local';
  const password = 'Test1234!';
  const name = 'Test User';

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      emailVerified: new Date(),
      credits: 150,
    },
    create: {
      email,
      name,
      password: hashedPassword,
      emailVerified: new Date(),
      credits: 150,
    },
  });

  console.log(`Seeded test account: ${user.email} (id: ${user.id}, credits: ${user.credits})`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
