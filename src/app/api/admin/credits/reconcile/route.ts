import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

/**
 * GET /api/admin/credits/reconcile
 * Returns a reconciliation report comparing the sum of CreditLedger deltas
 * against each user's current `User.credits` balance.
 *
 * Query params:
 *  - ?userId=xxx  — limit to a single user
 *  - ?fix=true    — if set, writes a correcting ledger entry + balance update
 *                   for users with discrepancies (admin-only, use with caution)
 *
 * The report helps identify ledger drift caused by failed compensations,
 * bugs, or manual DB edits.
 */
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const filterUserId = url.searchParams.get('userId');
  const shouldFix = url.searchParams.get('fix') === 'true';

  // Aggregate ledger deltas per user
  const ledgerSums = await prisma.creditLedger.groupBy({
    by: ['userId'],
    _sum: { delta: true },
    where: filterUserId ? { userId: filterUserId } : undefined,
  });

  // Fetch user balances
  const users = await prisma.user.findMany({
    where: filterUserId ? { id: filterUserId } : undefined,
    select: { id: true, email: true, credits: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  const discrepancies: Array<{
    userId: string;
    email: string;
    dbBalance: number;
    ledgerSum: number;
    discrepancy: number;
  }> = [];

  for (const entry of ledgerSums) {
    const user = userMap.get(entry.userId);
    if (!user) continue;
    const ledgerSum = entry._sum.delta ?? 0;
    const dbBalance = user.credits;
    const discrepancy = dbBalance - ledgerSum;
    if (discrepancy !== 0) {
      discrepancies.push({
        userId: user.id,
        email: user.email ?? '',
        dbBalance,
        ledgerSum,
        discrepancy,
      });
    }
  }

  // Also check users with no ledger entries but non-zero balance (e.g. signup grants)
  for (const user of users) {
    if (!ledgerSums.find((e) => e.userId === user.id) && user.credits !== 0) {
      discrepancies.push({
        userId: user.id,
        email: user.email ?? '',
        dbBalance: user.credits,
        ledgerSum: 0,
        discrepancy: user.credits,
      });
    }
  }

  // If fix mode, write correcting entries
  const fixes: Array<{ userId: string; adjustment: number; ok: boolean }> = [];
  if (shouldFix) {
    for (const d of discrepancies) {
      try {
        // Write a correcting ledger entry with the discrepancy amount
        // (negative discrepancy = ledger says more than DB → add credits to DB)
        // (positive discrepancy = DB has more than ledger → deduct credits from DB)
        const adjustment = -d.discrepancy;
        await prisma.$transaction([
          prisma.user.update({
            where: { id: d.userId },
            data: { credits: { increment: adjustment } },
          }),
          prisma.creditLedger.create({
            data: {
              userId: d.userId,
              delta: adjustment,
              reason: 'reconciliation_fix',
              ref: `admin:${session.user.id}:reconcile:${new Date().toISOString()}`,
            },
          }),
        ]);
        fixes.push({ userId: d.userId, adjustment, ok: true });
      } catch (e) {
        fixes.push({ userId: d.userId, adjustment: -d.discrepancy, ok: false });
      }
    }
  }

  return NextResponse.json({
    checked: users.length,
    discrepancyCount: discrepancies.length,
    discrepancies: discrepancies.sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy)),
    ...(shouldFix ? { fixes } : {}),
  });
}
