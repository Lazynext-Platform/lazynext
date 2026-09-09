import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StrategyService } from '@/lib/services/strategy-service';

/** GET /api/strategy/milestones/[id] — get a single milestone */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const milestone = await StrategyService.getMilestone(id);
  if (!milestone) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ milestone });
}

/** PATCH /api/strategy/milestones/[id] — update a milestone */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const milestone = await StrategyService.updateMilestone(id, {
      name: body.name,
      description: body.description,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      achievedDate: body.achievedDate ? new Date(body.achievedDate) : undefined,
      status: body.status,
      progress: body.progress,
      owner: body.owner,
      initiativeId: body.initiativeId,
    });
    return NextResponse.json({ milestone });
  } catch (e) {
    console.error('[strategy/milestones] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_milestone' }, { status: 500 });
  }
}

/** DELETE /api/strategy/milestones/[id] — delete a milestone */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await StrategyService.deleteMilestone(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[strategy/milestones] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_milestone' }, { status: 500 });
  }
}
