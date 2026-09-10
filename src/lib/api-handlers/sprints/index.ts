import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SprintService } from '@/lib/services/sprint-service';

/** GET /api/sprints — list sprints for the user's organization */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ sprints: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const sprints = await SprintService.list(organizationId, {
    status: (sp.get('status') as 'planning' | 'active' | 'completed' | 'cancelled') || undefined,
    projectId: sp.get('projectId') || undefined,
  });

  return NextResponse.json({ sprints });
}

/** POST /api/sprints — create a new sprint */
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
    return NextResponse.json({ error: 'start_date_required' }, { status: 400 });
  }
  if (!body.endDate) {
    return NextResponse.json({ error: 'end_date_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const sprint = await SprintService.create(organizationId, {
      name,
      goal: body.goal,
      startDate: body.startDate,
      endDate: body.endDate,
      projectId: body.projectId,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ sprint }, { status: 201 });
  } catch (e) {
    console.error('[sprints] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_sprint' }, { status: 500 });
  }
}
