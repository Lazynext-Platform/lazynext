import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/credits/analytics
 * Returns credit usage analytics for the authenticated user:
 *   - totalSpent, totalGranted, currentBalance
 *   - byReason: { [reason]: { count, totalDelta } }
 *   - byDay: [{ date, spent, granted }] (last 30 days)
 *   - byCreation: top 5 most expensive creations
 *   - projection: estimated days until credits run out (based on 7-day avg spend)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  // Fetch all ledger entries
  const ledger = await prisma.creditLedger.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
  });

  // Aggregate by reason
  const byReason: Record<string, { count: number; totalDelta: number }> = {};
  for (const entry of ledger) {
    if (!byReason[entry.reason]) {
      byReason[entry.reason] = { count: 0, totalDelta: 0 };
    }
    byReason[entry.reason].count++;
    byReason[entry.reason].totalDelta += entry.delta;
  }

  // Aggregate by day (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const byDayMap: Record<string, { spent: number; granted: number }> = {};
  for (const entry of ledger) {
    if (entry.createdAt < thirtyDaysAgo) continue;
    const dateStr = entry.createdAt.toISOString().slice(0, 10);
    if (!byDayMap[dateStr]) byDayMap[dateStr] = { spent: 0, granted: 0 };
    if (entry.delta < 0) byDayMap[dateStr].spent += Math.abs(entry.delta);
    else byDayMap[dateStr].granted += entry.delta;
  }
  const byDay = Object.entries(byDayMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top 5 most expensive creations
  const spendEntries = ledger.filter(e => e.reason === 'generate' && e.ref);
  const creationCosts: Record<string, number> = {};
  for (const entry of spendEntries) {
    const ref = entry.ref!;
    creationCosts[ref] = (creationCosts[ref] || 0) + Math.abs(entry.delta);
  }
  const byCreation = Object.entries(creationCosts)
    .map(([creationId, totalCost]) => ({ creationId, totalCost }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 5);

  // Projection: 7-day average daily spend
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentSpends = ledger.filter(e => e.delta < 0 && e.createdAt >= sevenDaysAgo);
  const totalRecentSpend = recentSpends.reduce((sum, e) => sum + Math.abs(e.delta), 0);
  const avgDailySpend = totalRecentSpend / 7;

  const totalSpent = ledger.filter(e => e.delta < 0).reduce((s, e) => s + Math.abs(e.delta), 0);
  const totalGranted = ledger.filter(e => e.delta > 0).reduce((s, e) => s + e.delta, 0);
  const currentBalance = totalGranted - totalSpent;

  const daysUntilEmpty = avgDailySpend > 0 ? Math.floor(currentBalance / avgDailySpend) : null;

  return NextResponse.json({
    totalSpent,
    totalGranted,
    currentBalance,
    byReason,
    byDay,
    byCreation,
    projection: {
      avgDailySpend: Math.round(avgDailySpend * 100) / 100,
      daysUntilEmpty,
      currentBalance,
    },
  });
}
