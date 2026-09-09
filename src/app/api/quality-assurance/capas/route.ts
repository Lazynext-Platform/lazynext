import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { QualityAssuranceService } from '@/lib/services/quality-assurance-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ capas: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'priority']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const capas = await QualityAssuranceService.listCapas(organizationId, opts as never);
  return NextResponse.json({ capas });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const priority = String(body.priority || '').trim();
  if (!title || !type || !priority) return NextResponse.json({ error: 'title_type_priority_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const capa = await QualityAssuranceService.createCapa(ws.organizationId, ws.id, {
      title, type: type as never, priority: priority as never,
      defectId: body.defectId, description: body.description, status: body.status,
      assignedTo: body.assignedTo, rootCause: body.rootCause, action: body.action,
      implementationDate: body.implementationDate, verificationDate: body.verificationDate,
      verifiedBy: body.verifiedBy, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ capa }, { status: 201 });
  } catch (e) {
    console.error('[quality-assurance/capas] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_capa' }, { status: 500 });
  }
}
