import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StrategyService } from '@/lib/services/strategy-service';

/** GET /api/strategy/initiatives/[id] — get a single initiative */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const initiative = await StrategyService.getInitiative(id);
  if (!initiative) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ initiative });
}

/** PATCH /api/strategy/initiatives/[id] — update an initiative */
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
    const initiative = await StrategyService.updateInitiative(id, {
      name: body.name,
      description: body.description,
      status: body.status,
      priority: body.priority,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      owner: body.owner,
      budget: body.budget,
      progress: body.progress,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    return NextResponse.json({ initiative });
  } catch (e) {
    console.error('[strategy/initiatives] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_initiative' }, { status: 500 });
  }
}

/** DELETE /api/strategy/initiatives/[id] — delete an initiative */
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
    await StrategyService.deleteInitiative(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[strategy/initiatives] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_initiative' }, { status: 500 });
  }
}
