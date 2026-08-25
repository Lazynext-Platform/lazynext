/**
 * Refund Reconciliation Script
 *
 * This script identifies CreditLedger entries with reason='purchase' that
 * may have been refunded via Dodo Payments without a corresponding
 * reason='refund' claw-back entry.
 *
 * Usage:
 *   node scripts/reconcile-refunds.mjs
 *
 * Environment variables:
 *   DATABASE_URL — Cloudflare D1 connection string
 *
 * The script is read-only — it does NOT modify any data. It only reports
 * potentially unreconciled refunds for manual review.
 *
 * To reconcile, manually create a CreditLedger entry with:
 *   delta: -<credits> (negative of the original purchase)
 *   reason: 'refund'
 *   ref: 'refund-<original-ref>'
 *   userId: <original-userId>
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Refund Reconciliation Report ===\n');

  // 1. Get all purchase ledger entries
  const purchases = await prisma.creditLedger.findMany({
    where: { reason: 'purchase' },
    select: { id: true, userId: true, delta: true, ref: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Total purchase entries: ${purchases.length}\n`);

  if (purchases.length === 0) {
    console.log('No purchase entries found. Nothing to reconcile.');
    return;
  }

  // 2. Get all refund ledger entries
  const refunds = await prisma.creditLedger.findMany({
    where: { reason: 'refund' },
    select: { ref: true, delta: true, createdAt: true },
  });

  console.log(`Total refund entries: ${refunds.length}\n`);

  // 3. Build a set of refunded payment refs
  // Refund entries use ref='refund-<original-ref>'
  const refundedRefs = new Set(
    refunds.map((r) => r.ref?.replace(/^refund-/, '')),
  );

  // 4. Find purchases that have a corresponding refund
  const reconciled = purchases.filter((p) => refundedRefs.has(p.ref));
  console.log(`Reconciled purchases (have matching refund): ${reconciled.length}`);

  // 5. Find purchases WITHOUT a corresponding refund
  // NOTE: This does NOT mean they were refunded — only Dodo Payments
  // dashboard can confirm actual refunds. This list is for manual review.
  const potentiallyUnreconciled = purchases.filter(
    (p) => !refundedRefs.has(p.ref),
  );
  console.log(`Purchases without matching refund entry: ${potentiallyUnreconciled.length}`);
  console.log('(These are NOT necessarily refunded — check Dodo dashboard to confirm)\n');

  if (potentiallyUnreconciled.length > 0) {
    console.log('=== Purchases to review against Dodo Payments dashboard ===\n');
    for (const p of potentiallyUnreconciled) {
      console.log(`  Date: ${p.createdAt.toISOString()}`);
      console.log(`  User: ${p.userId}`);
      console.log(`  Credits: +${p.delta}`);
      console.log(`  Payment Ref: ${p.ref}`);
      console.log(`  Ledger ID: ${p.id}`);
      console.log('');
    }
  }

  // 6. Summary
  console.log('=== Summary ===');
  console.log(`Total purchases: ${purchases.length}`);
  console.log(`Total refunds: ${refunds.length}`);
  console.log(`Reconciled: ${reconciled.length}`);
  console.log(`Potentially unreconciled: ${potentiallyUnreconciled.length}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Cross-reference "potentially unreconciled" purchases with Dodo Payments dashboard');
  console.log('2. For each confirmed refund without a ledger entry, manually create:');
  console.log('   - CreditLedger entry with reason="refund", ref="refund-<payment-ref>", delta=-<credits>');
  console.log('3. Update the user\'s credits balance: User.credits -= <credits>');
}

main()
  .catch((e) => {
    console.error('Reconciliation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
