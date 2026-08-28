import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/intelligence
 * Returns trend data for the intelligence dashboard:
 * - Hook type performance over time
 * - Angle ROI trends
 * - Platform comparison
 * - Best time-of-day to post (based on recordedAt timestamps)
 *
 * Query params:
 *   - days: number of days to look back (default: 30)
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30') || 30, 7), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const records = await prisma.creativePerformance.findMany({
    where: { userId: uid, recordedAt: { gte: since } },
    orderBy: { recordedAt: 'asc' },
  });

  if (records.length === 0) {
    return NextResponse.json({
      hookTrends: [],
      angleTrends: [],
      platformComparison: [],
      timeOfDay: [],
      summary: { totalRecords: 0, avgRoas: 0, avgCtr: 0, bestHook: null, bestAngle: null, bestPlatform: null },
    });
  }

  // ── Hook type performance over time ──
  const hookByDate: Record<string, Record<string, { roas: number[]; ctr: number[]; count: number }>> = {};
  for (const r of records) {
    if (!r.hookType) continue;
    const date = r.recordedAt.toISOString().slice(0, 10);
    if (!hookByDate[date]) hookByDate[date] = {};
    if (!hookByDate[date][r.hookType]) hookByDate[date][r.hookType] = { roas: [], ctr: [], count: 0 };
    hookByDate[date][r.hookType].roas.push(r.roas);
    hookByDate[date][r.hookType].ctr.push(r.ctr);
    hookByDate[date][r.hookType].count++;
  }

  const hookTrends = Object.entries(hookByDate).map(([date, hooks]) => ({
    date,
    hooks: Object.fromEntries(
      Object.entries(hooks).map(([type, data]) => [
        type,
        {
          avgRoas: data.roas.reduce((a, b) => a + b, 0) / data.roas.length,
          avgCtr: data.ctr.reduce((a, b) => a + b, 0) / data.ctr.length,
          count: data.count,
        },
      ])
    ),
  })).sort((a, b) => a.date.localeCompare(b.date));

  // ── Angle ROI trends ──
  const angleByDate: Record<string, Record<string, { roas: number[]; count: number }>> = {};
  for (const r of records) {
    if (!r.angleName) continue;
    const date = r.recordedAt.toISOString().slice(0, 10);
    if (!angleByDate[date]) angleByDate[date] = {};
    if (!angleByDate[date][r.angleName]) angleByDate[date][r.angleName] = { roas: [], count: 0 };
    angleByDate[date][r.angleName].roas.push(r.roas);
    angleByDate[date][r.angleName].count++;
  }

  const angleTrends = Object.entries(angleByDate).map(([date, angles]) => ({
    date,
    angles: Object.fromEntries(
      Object.entries(angles).map(([name, data]) => [
        name,
        {
          avgRoas: data.roas.reduce((a, b) => a + b, 0) / data.roas.length,
          count: data.count,
        },
      ])
    ),
  })).sort((a, b) => a.date.localeCompare(b.date));

  // ── Platform comparison ──
  const platformStats: Record<string, { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; roas: number[]; ctr: number[]; count: number }> = {};
  for (const r of records) {
    if (!platformStats[r.platform]) platformStats[r.platform] = { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, roas: [], ctr: [], count: 0 };
    const p = platformStats[r.platform];
    p.impressions += r.impressions;
    p.clicks += r.clicks;
    p.conversions += r.conversions;
    p.spend += r.spend;
    p.revenue += r.revenue;
    p.roas.push(r.roas);
    p.ctr.push(r.ctr);
    p.count++;
  }

  const platformComparison = Object.entries(platformStats).map(([platform, data]) => ({
    platform,
    impressions: data.impressions,
    clicks: data.clicks,
    conversions: data.conversions,
    spend: data.spend,
    revenue: data.revenue,
    avgRoas: data.roas.reduce((a, b) => a + b, 0) / data.roas.length,
    avgCtr: data.ctr.reduce((a, b) => a + b, 0) / data.ctr.length,
    count: data.count,
  }));

  // ── Best time of day to post ──
  const hourStats: Array<{ hour: number; impressions: number; clicks: number; conversions: number; roas: number[]; count: number }> = [];
  for (let h = 0; h < 24; h++) hourStats.push({ hour: h, impressions: 0, clicks: 0, conversions: 0, roas: [], count: 0 });
  for (const r of records) {
    const hour = r.recordedAt.getHours();
    hourStats[hour].impressions += r.impressions;
    hourStats[hour].clicks += r.clicks;
    hourStats[hour].conversions += r.conversions;
    hourStats[hour].roas.push(r.roas);
    hourStats[hour].count++;
  }
  const timeOfDay = hourStats
    .filter(h => h.count > 0)
    .map(h => ({
      hour: h.hour,
      impressions: h.impressions,
      clicks: h.clicks,
      conversions: h.conversions,
      avgRoas: h.roas.reduce((a, b) => a + b, 0) / h.roas.length,
      count: h.count,
    }))
    .sort((a, b) => b.avgRoas - a.avgRoas);

  // ── Summary ──
  const allRoas = records.map(r => r.roas);
  const allCtr = records.map(r => r.ctr);
  const hookRoas: Record<string, number[]> = {};
  const angleRoas: Record<string, number[]> = {};
  const platRoas: Record<string, number[]> = {};
  for (const r of records) {
    if (r.hookType) { if (!hookRoas[r.hookType]) hookRoas[r.hookType] = []; hookRoas[r.hookType].push(r.roas); }
    if (r.angleName) { if (!angleRoas[r.angleName]) angleRoas[r.angleName] = []; angleRoas[r.angleName].push(r.roas); }
    if (!platRoas[r.platform]) platRoas[r.platform] = []; platRoas[r.platform].push(r.roas);
  }

  const bestOf = (data: Record<string, number[]>): { name: string; avgRoas: number } | null => {
    let best: { name: string; avgRoas: number } | null = null;
    for (const [name, roas] of Object.entries(data)) {
      const avg = roas.reduce((a, b) => a + b, 0) / roas.length;
      if (!best || avg > best.avgRoas) best = { name, avgRoas: avg };
    }
    return best;
  };

  return NextResponse.json({
    hookTrends,
    angleTrends,
    platformComparison,
    timeOfDay,
    summary: {
      totalRecords: records.length,
      avgRoas: allRoas.reduce((a, b) => a + b, 0) / allRoas.length,
      avgCtr: allCtr.reduce((a, b) => a + b, 0) / allCtr.length,
      bestHook: bestOf(hookRoas),
      bestAngle: bestOf(angleRoas),
      bestPlatform: bestOf(platRoas),
    },
  });
}
