import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngineeringManagementService } from '@/lib/services/engineering-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ sprints: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['team', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const sprints = await EngineeringManagementService.listSprints(organizationId, opts as never);
  return NextResponse.json({ sprints });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const team = String(body.team || '').trim();
  const startDate = String(body.startDate || '').trim();
  const endDate = String(body.endDate || '').trim();
  if (!name || !team || !startDate || !endDate) return NextResponse.json({ error: 'name_team_startDate_endDate_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const sprint = await EngineeringManagementService.createSprint(ws.organizationId, ws.id, {
      name, team, startDate, endDate,
      status: body.status, plannedPoints: body.plannedPoints, completedPoints: body.completedPoints,
      committedPoints: body.committedPoints, addedPoints: body.addedPoints, removedPoints: body.removedPoints,
      teamMembers: body.teamMembers, goal: body.goal, retrospective: body.retrospective, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ sprint }, { status: 201 });
  } catch (e) {
    console.error('[engineering-management/sprints] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_sprint' }, { status: 500 });
  }
}
