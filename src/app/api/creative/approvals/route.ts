import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/approvals
 * List all campaigns and creative packages in pending_approval state.
 *
 * Query params:
 *   - type: 'campaign' | 'creative' (default: both)
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const type = url.searchParams.get('type');

  const [campaigns, assets] = await Promise.all([
    type === 'creative' ? [] : prisma.adCampaign.findMany({
      where: { userId: uid, status: 'pending_approval' },
      orderBy: { createdAt: 'desc' },
    }),
    type === 'campaign' ? [] : prisma.asset.findMany({
      where: { userId: uid, type: 'creative_package' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  // Filter assets by approval status in memory (JSON filtering is complex in Prisma)
  const filteredAssets = assets.filter(a => {
    let meta: Record<string, unknown> = {};
    if (typeof a.metadata === 'string') { try { meta = JSON.parse(a.metadata); } catch { return false; } }
    else if (a.metadata && typeof a.metadata === 'object') meta = a.metadata as Record<string, unknown>;
    return meta.approvalStatus === 'pending';
  });

  return NextResponse.json({
    campaigns: campaigns.map(c => ({
      id: c.id,
      platform: c.platform,
      name: c.name,
      status: c.status,
      budgetDaily: c.budgetDaily,
      budgetTotal: c.budgetTotal,
      currency: c.currency,
      creativeIds: c.creativeIds,
      createdAt: c.createdAt.toISOString(),
    })),
    assets: filteredAssets.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      createdAt: a.createdAt.toISOString(),
    })),
    stats: {
      totalPending: campaigns.length + filteredAssets.length,
      pendingCampaigns: campaigns.length,
      pendingCreatives: filteredAssets.length,
    },
  });
}

/**
 * POST /api/creative/approvals
 * Approve, reject, or request changes on a pending item.
 *
 * Body: { type: 'campaign' | 'creative', id: string, action: 'approve' | 'reject' | 'request_changes', note?: string }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '');
  const id = String(body.id || '');
  const action = String(body.action || '');
  const note = String(body.note || '');

  if (!['campaign', 'creative'].includes(type))
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  if (!['approve', 'reject', 'request_changes'].includes(action))
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });

  if (type === 'campaign') {
    const campaign = await prisma.adCampaign.findFirst({ where: { id, userId: uid } });
    if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const newStatus = action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : 'changes_requested';
    await prisma.adCampaign.update({ where: { id }, data: { status: newStatus } });

    return NextResponse.json({
      ok: true,
      id,
      type: 'campaign',
      action,
      newStatus,
      note,
    });
  } else {
    // For creative assets, store approval status in metadata
    const asset = await prisma.asset.findFirst({ where: { id, userId: uid } });
    if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Parse existing metadata
    let metadata: Record<string, unknown> = {};
    if (typeof asset.metadata === 'string') {
      try { metadata = JSON.parse(asset.metadata); } catch { metadata = {}; }
    } else if (asset.metadata && typeof asset.metadata === 'object') {
      metadata = asset.metadata as Record<string, unknown>;
    }

    // Update approval status
    metadata.approvalStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested';
    if (note) metadata.approvalNote = note;
    metadata.approvedAt = new Date().toISOString();
    metadata.approvedBy = uid;

    await prisma.asset.update({ where: { id }, data: { metadata: JSON.parse(JSON.stringify(metadata)) } });

    return NextResponse.json({
      ok: true,
      id,
      type: 'creative',
      action,
      newStatus: metadata.approvalStatus,
      note,
    });
  }
}
