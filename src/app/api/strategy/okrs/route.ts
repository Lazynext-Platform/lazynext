import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StrategyService } from '@/lib/services/strategy-service';

/** GET /api/strategy/okrs — list OKRs (goals with KPIs) */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ okrs: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const okrs = await StrategyService.getOkRs(organizationId);
  return NextResponse.json({ okrs });
}

/** POST /api/strategy/okrs — create an OKR (objective + key results) */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const okr = await StrategyService.createOkR(organizationId, {
      title,
      description: body.description,
      priority: body.priority,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      createdById: session.user.id,
      workspaceId: body.workspaceId,
      keyResults: Array.isArray(body.keyResults) ? body.keyResults : undefined,
    });
    return NextResponse.json({ okr }, { status: 201 });
  } catch (e) {
    console.error('[strategy/okrs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_okr' }, { status: 500 });
  }
}
