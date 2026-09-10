import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LaborRelationsService } from '@/lib/services/labor-relations-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ grievances: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'priority']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const grievances = await LaborRelationsService.listGrievances(organizationId, opts as never);
  return NextResponse.json({ grievances });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !type) return NextResponse.json({ error: 'title_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const grievance = await LaborRelationsService.createGrievance(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status, priority: body.priority,
      filedBy: body.filedBy, filedDate: body.filedDate, unionId: body.unionId,
      assignedTo: body.assignedTo, department: body.department,
      summary: body.summary, resolution: body.resolution, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ grievance }, { status: 201 });
  } catch (e) {
    console.error('[labor-relations/grievances] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_grievance' }, { status: 500 });
  }
}
