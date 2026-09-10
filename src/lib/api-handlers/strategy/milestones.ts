import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StrategyService } from '@/lib/services/strategy-service';

/** GET /api/strategy/milestones — list milestones */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ milestones: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const filters: {
    initiativeId?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
  } = {};
  const initiativeId = url.searchParams.get('initiativeId');
  const status = url.searchParams.get('status');
  const dateStart = url.searchParams.get('dateStart');
  const dateEnd = url.searchParams.get('dateEnd');
  if (initiativeId) filters.initiativeId = initiativeId;
  if (status) filters.status = status;
  if (dateStart && dateEnd) {
    filters.dateRange = { start: new Date(dateStart), end: new Date(dateEnd) };
  }

  const milestones = await StrategyService.listMilestones(organizationId, filters);
  return NextResponse.json({ milestones });
}

/** POST /api/strategy/milestones — create a milestone */
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
  if (!body.targetDate) {
    return NextResponse.json({ error: 'targetDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const milestone = await StrategyService.createMilestone(organizationId, {
      name,
      description: body.description,
      targetDate: new Date(body.targetDate),
      initiativeId: body.initiativeId,
      status: body.status,
      progress: body.progress,
      owner: body.owner,
    });
    return NextResponse.json({ milestone }, { status: 201 });
  } catch (e) {
    console.error('[strategy/milestones] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_milestone' }, { status: 500 });
  }
}
