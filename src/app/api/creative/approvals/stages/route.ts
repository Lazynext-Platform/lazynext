import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

const STAGES = ['creative_review', 'brand_review', 'legal_review', 'final_approval'] as const;
type Stage = typeof STAGES[number];

/**
 * GET /api/creative/approvals/stages
 * List all approval stages for the user's assets and campaigns.
 * Query params:
 *   - stage: filter by stage
 *   - status: filter by status
 *   - type: 'campaign' | 'creative' (default: both)
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const stageFilter = url.searchParams.get('stage');
  const statusFilter = url.searchParams.get('status');

  // Get approval stages for user's assets
  const assetStages = await prisma.approvalStage.findMany({
    where: {
      ...(stageFilter ? { stage: stageFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      asset: { userId: uid },
    },
    include: { asset: true },
    orderBy: { submittedAt: 'desc' },
  });

  // Get approval stages for user's campaigns
  const campaignStages = await prisma.approvalStage.findMany({
    where: {
      ...(stageFilter ? { stage: stageFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      campaign: { userId: uid },
    },
    include: { campaign: true },
    orderBy: { submittedAt: 'desc' },
  });

  return NextResponse.json({
    assetStages: assetStages.map(s => ({
      id: s.id,
      type: 'creative',
      assetId: s.assetId,
      assetName: s.asset?.name || 'Unknown',
      stage: s.stage,
      status: s.status,
      reviewerId: s.reviewerId,
      note: s.note,
      submittedAt: s.submittedAt.toISOString(),
      reviewedAt: s.reviewedAt?.toISOString() || null,
    })),
    campaignStages: campaignStages.map(s => ({
      id: s.id,
      type: 'campaign',
      campaignId: s.campaignId,
      campaignName: s.campaign?.name || 'Unknown',
      stage: s.stage,
      status: s.status,
      reviewerId: s.reviewerId,
      note: s.note,
      submittedAt: s.submittedAt.toISOString(),
      reviewedAt: s.reviewedAt?.toISOString() || null,
    })),
    stats: {
      total: assetStages.length + campaignStages.length,
      pending: [...assetStages, ...campaignStages].filter(s => s.status === 'pending').length,
      approved: [...assetStages, ...campaignStages].filter(s => s.status === 'approved').length,
      rejected: [...assetStages, ...campaignStages].filter(s => s.status === 'rejected').length,
      changesRequested: [...assetStages, ...campaignStages].filter(s => s.status === 'changes_requested').length,
    },
  });
}

/**
 * POST /api/creative/approvals/stages
 * Submit a new item for multi-stage approval, or advance/reject at a specific stage.
 *
 * Body for submit: { action: 'submit', type: 'campaign' | 'creative', id: string }
 * Body for review: { action: 'review', stageId: string, decision: 'approve' | 'reject' | 'request_changes', note?: string }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');

  if (action === 'submit') {
    const type = String(body.type || '');
    const id = String(body.id || '');

    if (!['campaign', 'creative'].includes(type))
      return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
    if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

    // Verify ownership
    if (type === 'campaign') {
      const campaign = await prisma.adCampaign.findFirst({ where: { id, userId: uid } });
      if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    } else {
      const asset = await prisma.asset.findFirst({ where: { id, userId: uid } });
      if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Create the first stage (creative_review)
    const stage = await prisma.approvalStage.create({
      data: {
        ...(type === 'campaign' ? { campaignId: id } : { assetId: id }),
        stage: 'creative_review',
        status: 'pending',
      },
    });

    return NextResponse.json({ ok: true, stageId: stage.id, stage: stage.stage });
  }

  if (action === 'review') {
    const stageId = String(body.stageId || '');
    const decision = String(body.decision || '');
    const note = String(body.note || '');

    if (!stageId) return NextResponse.json({ error: 'stageId_required' }, { status: 400 });
    if (!['approve', 'reject', 'request_changes'].includes(decision))
      return NextResponse.json({ error: 'invalid_decision' }, { status: 400 });

    const stage = await prisma.approvalStage.findFirst({ where: { id: stageId } });
    if (!stage) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Verify ownership of the related asset or campaign
    if (stage.assetId) {
      const asset = await prisma.asset.findFirst({ where: { id: stage.assetId, userId: uid } });
      if (!asset) return NextResponse.json({ error: 'not_authorized' }, { status: 403 });
    } else if (stage.campaignId) {
      const campaign = await prisma.adCampaign.findFirst({ where: { id: stage.campaignId, userId: uid } });
      if (!campaign) return NextResponse.json({ error: 'not_authorized' }, { status: 403 });
    }

    const newStatus = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'changes_requested';

    // Update the current stage
    await prisma.approvalStage.update({
      where: { id: stageId },
      data: {
        status: newStatus,
        reviewerId: uid,
        note: note || null,
        reviewedAt: new Date(),
      },
    });

    // If approved, create the next stage (if not already at final_approval)
    let nextStage: string | null = null;
    if (decision === 'approve') {
      const currentStageIdx = STAGES.indexOf(stage.stage as Stage);
      if (currentStageIdx >= 0 && currentStageIdx < STAGES.length - 1) {
        nextStage = STAGES[currentStageIdx + 1];
        await prisma.approvalStage.create({
          data: {
            ...(stage.assetId ? { assetId: stage.assetId } : { campaignId: stage.campaignId }),
            stage: nextStage,
            status: 'pending',
          },
        });
      } else {
        // Final approval — update the campaign/asset status
        if (stage.campaignId) {
          await prisma.adCampaign.update({ where: { id: stage.campaignId }, data: { status: 'active' } });
        }
        if (stage.assetId) {
          const asset = await prisma.asset.findFirst({ where: { id: stage.assetId } });
          if (asset) {
            let metadata: Record<string, unknown> = {};
            if (typeof asset.metadata === 'string') {
              try { metadata = JSON.parse(asset.metadata); } catch { metadata = {}; }
            } else if (asset.metadata && typeof asset.metadata === 'object') {
              metadata = asset.metadata as Record<string, unknown>;
            }
            metadata.approvalStatus = 'approved';
            metadata.approvedAt = new Date().toISOString();
            await prisma.asset.update({ where: { id: stage.assetId }, data: { metadata: JSON.parse(JSON.stringify(metadata)) } });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      stageId,
      decision,
      newStatus,
      nextStage,
      note,
    });
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}
