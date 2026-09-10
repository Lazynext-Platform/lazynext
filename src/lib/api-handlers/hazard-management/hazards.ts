import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { HazardManagementService } from '@/lib/services/hazard-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ hazards: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const hazards = await HazardManagementService.listHazards(organizationId, opts as never);
  return NextResponse.json({ hazards });
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
    const hazard = await HazardManagementService.createHazard(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, location: body.location,
      source: body.source, severity: body.severity, likelihood: body.likelihood,
      riskLevel: body.riskLevel, identifiedBy: body.identifiedBy,
      identifiedDate: body.identifiedDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ hazard }, { status: 201 });
  } catch (e) {
    console.error('[hazard-management/hazards] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_hazard' }, { status: 500 });
  }
}
