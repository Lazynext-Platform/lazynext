import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** GET /api/portfolio/allocations — list portfolio allocations */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ allocations: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { strategy?: string; status?: string } = {};
  const strategy = url.searchParams.get('strategy');
  const status = url.searchParams.get('status');
  if (strategy) opts.strategy = strategy;
  if (status) opts.status = status;

  const allocations = await PortfolioService.listAllocations(organizationId, opts as never);
  return NextResponse.json({ allocations });
}

/** POST /api/portfolio/allocations — create a portfolio allocation */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const strategy = String(body.strategy || '').trim();
  const targetWeights = body.targetWeights;
  if (!name || !strategy || !targetWeights) {
    return NextResponse.json({ error: 'name_strategy_targetWeights_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const allocation = await PortfolioService.createAllocation(
      ws.organizationId, ws.id,
      {
        name, strategy: strategy as never, targetWeights,
        currentWeights: body.currentWeights, driftThreshold: body.driftThreshold,
        status: body.status, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ allocation }, { status: 201 });
  } catch (e) {
    console.error('[portfolio/allocations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_allocation' }, { status: 500 });
  }
}
