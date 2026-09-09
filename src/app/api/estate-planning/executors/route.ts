import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EstatePlanningService } from '@/lib/services/estate-planning-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ executors: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const executors = await EstatePlanningService.listExecutors(organizationId, opts as never);
  return NextResponse.json({ executors });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const executor = await EstatePlanningService.createExecutor(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, relationship: body.relationship,
      contactInfo: body.contactInfo, compensation: body.compensation,
      appointmentDate: body.appointmentDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ executor }, { status: 201 });
  } catch (e) {
    console.error('[estate-planning/executors] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_executor' }, { status: 500 });
  }
}
