/**
 * Seed the test account for E2E tests.
 * Creates test@lazynext.local with password Test1234! and 150 credits.
 * Idempotent — safe to run multiple times.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

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
