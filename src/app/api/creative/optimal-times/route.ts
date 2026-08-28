import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/optimal-times
 * Returns AI-suggested optimal posting times based on performance data.
 * Analyzes the user's CreativePerformance records to find the best
 * day-of-week and hour-of-day for each platform.
 *
 * Query params:
 *   - platform: filter by platform
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const platformFilter = url.searchParams.get('platform') || '';

  // Fetch performance records
  const records = await prisma.creativePerformance.findMany({
    where: {
      userId: uid,
      ...(platformFilter ? { platform: platformFilter } : {}),
    },
    orderBy: { recordedAt: 'desc' },
    take: 500,
  });

  if (records.length === 0) {
    return NextResponse.json({
      suggestions: [],
      hasData: false,
      message: 'No performance data yet. Post creatives and track results to get optimal posting time suggestions.',
    });
  }

  // Group by day-of-week and hour
  const dayHourStats: Record<string, { roas: number[]; ctr: number[]; impressions: number[] }> = {};
  const platformStats: Record<string, { roas: number[]; bestDay: string; bestHour: number }> = {};

  for (const r of records) {
    const date = new Date(r.recordedAt);
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const hour = date.getHours();
    const key = `${dayName}-${hour}`;

    if (!dayHourStats[key]) dayHourStats[key] = { roas: [], ctr: [], impressions: [] };
    dayHourStats[key].roas.push(r.roas);
    dayHourStats[key].ctr.push(r.ctr);
    dayHourStats[key].impressions.push(r.impressions);

    // Track per-platform
    if (!platformStats[r.platform]) platformStats[r.platform] = { roas: [], bestDay: '', bestHour: 0 };
    platformStats[r.platform].roas.push(r.roas);
  }

  // Find best day-hour combinations
  const suggestions: Array<{
    day: string;
    hour: number;
    avgRoas: number;
    avgCtr: number;
    totalImpressions: number;
    label: string;
    platform: string;
  }> = [];

  for (const [key, stats] of Object.entries(dayHourStats)) {
    const [day, hourStr] = key.split('-');
    const hour = parseInt(hourStr);
    const avgRoas = stats.roas.reduce((a, b) => a + b, 0) / stats.roas.length;
    const avgCtr = stats.ctr.reduce((a, b) => a + b, 0) / stats.ctr.length;
    const totalImpressions = stats.impressions.reduce((a, b) => a + b, 0);

    suggestions.push({
      day,
      hour,
      avgRoas,
      avgCtr,
      totalImpressions,
      label: `${day.charAt(0).toUpperCase() + day.slice(1)} ${hour}:00`,
      platform: platformFilter || 'all',
    });
  }

  // Sort by ROAS descending and return top 5
  const top = suggestions.sort((a, b) => b.avgRoas - a.avgRoas).slice(0, 5);

  // Per-platform best times
  const platformBest: Array<{ platform: string; bestDay: string; bestHour: number; avgRoas: number }> = [];
  for (const [platform, stats] of Object.entries(platformStats)) {
    const platformRecords = records.filter(r => r.platform === platform);
    const dayHourRoas: Record<string, number[]> = {};
    for (const r of platformRecords) {
      const date = new Date(r.recordedAt);
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
      const hour = date.getHours();
      const key = `${dayName}-${hour}`;
      if (!dayHourRoas[key]) dayHourRoas[key] = [];
      dayHourRoas[key].push(r.roas);
    }
    let bestKey = '';
    let bestRoas = 0;
    for (const [key, roasArr] of Object.entries(dayHourRoas)) {
      const avg = roasArr.reduce((a, b) => a + b, 0) / roasArr.length;
      if (avg > bestRoas) { bestRoas = avg; bestKey = key; }
    }
    if (bestKey) {
      const [day, hourStr] = bestKey.split('-');
      platformBest.push({ platform, bestDay: day, bestHour: parseInt(hourStr), avgRoas: bestRoas });
    }
  }

  return NextResponse.json({
    suggestions: top,
    platformBest,
    hasData: true,
    totalRecords: records.length,
  });
}
