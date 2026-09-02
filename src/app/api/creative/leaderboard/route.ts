import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/leaderboard
 * Returns the user's top-performing creatives ranked by ROAS, then CTR.
 *
 * Query params:
 *   - platform: filter by platform (meta | google), optional
 *   - limit: max results (default 10, max 20)
 *
 * Returns:
 *   - entries: Array<{ creationId, platform, hookType, angleName, impressions, clicks, conversions, spend, revenue, ctr, cvr, roas, recordedAt }>
 *   - summary: { totalImpressions, totalClicks, totalConversions, totalSpend, totalRevenue, avgCtr, avgRoas }
 *   - byPlatform: { meta: { count, avgRoas }, google: { count, avgRoas } }
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') || undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 20);

  const where = { userId: uid, ...(platform ? { platform } : {}) };
  try {
    const records = await prisma.creativePerformance.findMany({
      where,
      orderBy: [{ roas: 'desc' }, { ctr: 'desc' }],
      take: limit,
    });

    // Summary
    const allRecords = await prisma.creativePerformance.findMany({ where: { userId: uid } });
    const totalImpressions = allRecords.reduce((s, r) => s + r.impressions, 0);
    const totalClicks = allRecords.reduce((s, r) => s + r.clicks, 0);
    const totalConversions = allRecords.reduce((s, r) => s + r.conversions, 0);
    const totalSpend = allRecords.reduce((s, r) => s + r.spend, 0);
    const totalRevenue = allRecords.reduce((s, r) => s + r.revenue, 0);
    const avgCtr = allRecords.length > 0 ? allRecords.reduce((s, r) => s + r.ctr, 0) / allRecords.length : 0;
    const avgRoas = allRecords.length > 0 ? allRecords.reduce((s, r) => s + r.roas, 0) / allRecords.length : 0;

    // By platform
    const platforms = ['meta', 'google'];
    const byPlatform: Record<string, { count: number; avgRoas: number }> = {};
    for (const p of platforms) {
      const pRecords = allRecords.filter(r => r.platform === p);
      byPlatform[p] = {
        count: pRecords.length,
        avgRoas: pRecords.length > 0 ? pRecords.reduce((s, r) => s + r.roas, 0) / pRecords.length : 0,
      };
    }

    return NextResponse.json({
      entries: records.map(r => ({
        creationId: r.creationId,
        platform: r.platform,
        hookType: r.hookType,
        angleName: r.angleName,
        impressions: r.impressions,
        clicks: r.clicks,
        conversions: r.conversions,
        spend: r.spend,
        revenue: r.revenue,
        ctr: r.ctr,
        cvr: r.cvr,
        roas: r.roas,
        recordedAt: r.recordedAt.toISOString(),
      })),
      summary: {
        totalImpressions,
        totalClicks,
        totalConversions,
        totalSpend,
        totalRevenue,
        avgCtr: Math.round(avgCtr * 10000) / 10000,
        avgRoas: Math.round(avgRoas * 100) / 100,
      },
      byPlatform,
    });
  } catch {
    // D1 cold-start — return empty data
    return NextResponse.json({ entries: [], summary: {}, byPlatform: {} });
  }
}
