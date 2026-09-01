import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/calendar
 * Returns ad campaigns and creative assets grouped by date for calendar display.
 *
 * Query params:
 *   - month: YYYY-MM (default: current month)
 *
 * Returns:
 *   - entries: Array<{ date, type, name, platform, status, id }>
 *   - upcoming: Array of entries with scheduled/active status in the next 7 days
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const monthParam = url.searchParams.get('month');
  const now = new Date();

  // Determine month range
  const year = monthParam ? parseInt(monthParam.split('-')[0]) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam.split('-')[1]) - 1 : now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  try {
    // Fetch ad campaigns in the month range
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        userId: uid,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch creative assets in the month range
    const assets = await prisma.asset.findMany({
      where: {
        userId: uid,
        createdAt: { gte: monthStart, lte: monthEnd },
        type: { in: ['creative_package', 'brief', 'script', 'storyboard'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build calendar entries
    const entries: Array<{
      date: string;
      type: 'campaign' | 'creative';
      name: string;
      platform?: string;
      status?: string;
      id: string;
    }> = [];

    for (const c of campaigns) {
      entries.push({
        date: c.createdAt.toISOString().slice(0, 10),
        type: 'campaign',
        name: c.name,
        platform: c.platform,
        status: c.status,
        id: c.id,
      });
    }

    for (const a of assets) {
      entries.push({
        date: a.createdAt.toISOString().slice(0, 10),
        type: 'creative',
        name: a.name,
        id: a.id,
      });
    }

    // Sort by date
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // Upcoming: campaigns with active/pending status in the next 7 days
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = entries.filter(e =>
      e.type === 'campaign' &&
      (e.status === 'active' || e.status === 'pending_approval') &&
      e.date >= now.toISOString().slice(0, 10) &&
      e.date <= sevenDaysFromNow.toISOString().slice(0, 10)
    );

    return NextResponse.json({
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      entries,
      upcoming,
      stats: {
        totalCampaigns: campaigns.length,
        totalCreatives: assets.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      },
    });
  } catch {
    // D1 cold-start — return empty data
    return NextResponse.json({ entries: [], upcoming: [] });
  }
}
