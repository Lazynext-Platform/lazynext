import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FieldServiceService } from '@/lib/services/field-service-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ assignments: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['orderId', 'technicianId', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const assignments = await FieldServiceService.listAssignments(organizationId, opts as never);
  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.orderId || '').trim();
  const technicianId = String(body.technicianId || '').trim();
  if (!orderId || !technicianId) return NextResponse.json({ error: 'orderId_technicianId_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const assignment = await FieldServiceService.createAssignment(ws.organizationId, ws.id, {
      orderId, technicianId,
      status: body.status, assignedDate: body.assignedDate, acceptedDate: body.acceptedDate,
      startedDate: body.startedDate, completedDate: body.completedDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (e) {
    console.error('[field-service/assignments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_assignment' }, { status: 500 });
  }
}
