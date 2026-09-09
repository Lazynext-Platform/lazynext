import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** GET /api/portfolio/allocations/[id] — get a single portfolio allocation */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const allocation = await PortfolioService.getAllocation(id);
  if (!allocation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ allocation });
}

/** PATCH /api/portfolio/allocations/[id] — update a portfolio allocation */
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
    const allocation = await PortfolioService.updateAllocation(id, {
      name: body.name, strategy: body.strategy, targetWeights: body.targetWeights,
      currentWeights: body.currentWeights, driftThreshold: body.driftThreshold,
      status: body.status, notes: body.notes,
    });
    if (!allocation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ allocation });
  } catch (e) {
    console.error('[portfolio/allocations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_allocation' }, { status: 500 });
  }
}

/** DELETE /api/portfolio/allocations/[id] — delete a portfolio allocation */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ok = await PortfolioService.deleteAllocation(id);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
