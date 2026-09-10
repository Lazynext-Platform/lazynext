import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StrategyService } from '@/lib/services/strategy-service';

/** GET /api/strategy/initiatives — list strategic initiatives */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ initiatives: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const filters: { status?: string; priority?: string; owner?: string; search?: string } = {};
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const owner = url.searchParams.get('owner');
  const search = url.searchParams.get('search');
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (owner) filters.owner = owner;
  if (search) filters.search = search;

  const initiatives = await StrategyService.listInitiatives(organizationId, filters);
  return NextResponse.json({ initiatives });
}

/** POST /api/strategy/initiatives — create a strategic initiative */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  if (!body.startDate) {
    return NextResponse.json({ error: 'startDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const initiative = await StrategyService.createInitiative(organizationId, {
      name,
      description: body.description,
      status: body.status,
      priority: body.priority,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      owner: body.owner,
      budget: body.budget,
      progress: body.progress,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      workspaceId: body.workspaceId,
    });
    return NextResponse.json({ initiative }, { status: 201 });
  } catch (e) {
    console.error('[strategy/initiatives] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_initiative' }, { status: 500 });
  }
}
