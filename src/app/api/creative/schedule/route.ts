import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/schedule
 * Returns scheduled posts for the user.
 * Query params:
 *   - month: YYYY-MM (default: current month)
 *   - platform: filter by platform
 *   - status: filter by status
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const monthParam = url.searchParams.get('month');
  const platformFilter = url.searchParams.get('platform') || '';
  const statusFilter = url.searchParams.get('status') || '';
  const now = new Date();

  const year = monthParam ? parseInt(monthParam.split('-')[0]) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam.split('-')[1]) - 1 : now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  // Fetch campaigns (scheduled posts)
  const campaigns = await prisma.adCampaign.findMany({
    where: {
      userId: uid,
      createdAt: { gte: monthStart, lte: monthEnd },
      ...(platformFilter ? { platform: platformFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch creative assets
  const assets = await prisma.asset.findMany({
    where: {
      userId: uid,
      createdAt: { gte: monthStart, lte: monthEnd },
      type: { in: ['creative_package', 'brief', 'script', 'storyboard'] },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Build scheduled entries
  const entries: Array<{
    id: string;
    date: string;
    type: 'campaign' | 'creative';
    name: string;
    platform?: string;
    status?: string;
    budgetDaily?: number | null;
    creativeIds?: unknown;
  }> = [];

  for (const c of campaigns) {
    entries.push({
      id: c.id,
      date: c.createdAt.toISOString().slice(0, 10),
      type: 'campaign',
      name: c.name,
      platform: c.platform,
      status: c.status,
      budgetDaily: c.budgetDaily,
      creativeIds: c.creativeIds,
    });
  }

  for (const a of assets) {
    entries.push({
      id: a.id,
      date: a.createdAt.toISOString().slice(0, 10),
      type: 'creative',
      name: a.name,
    });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    month: `${year}-${String(month + 1).padStart(2, '0')}`,
    entries,
    stats: {
      total: entries.length,
      campaigns: campaigns.length,
      creatives: assets.length,
      active: campaigns.filter(c => c.status === 'active').length,
      pending: campaigns.filter(c => c.status === 'pending_approval').length,
    },
  });
}

/**
 * POST /api/creative/schedule
 * Reschedule a campaign to a new date.
 * Body: { campaignId: string, newDate: string (YYYY-MM-DD) }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const campaignId = String(body.campaignId || '');
  const newDate = String(body.newDate || '');

  if (!campaignId) return NextResponse.json({ error: 'campaign_id_required' }, { status: 400 });
  if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    return NextResponse.json({ error: 'invalid_date', detail: 'Date must be YYYY-MM-DD' }, { status: 400 });
  }

  const campaign = await prisma.adCampaign.findFirst({ where: { id: campaignId, userId: uid } });
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Update the campaign's scheduled date by adjusting createdAt
  // (In a real system, there would be a scheduledDate field, but we use createdAt for now)
  const newDateObj = new Date(newDate + 'T' + campaign.createdAt.toISOString().slice(11));

  await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { createdAt: newDateObj },
  });

  return NextResponse.json({ ok: true, campaignId, newDate });
}
