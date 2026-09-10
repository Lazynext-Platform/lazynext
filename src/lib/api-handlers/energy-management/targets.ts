import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EnergyManagementService } from '@/lib/services/energy-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ targets: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const targets = await EnergyManagementService.listEfficiencyTargets(organizationId, opts as never);
  return NextResponse.json({ targets });
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
    const target = await EnergyManagementService.createEfficiencyTarget(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, targetValue: body.targetValue,
      actualValue: body.actualValue, unit: body.unit, startDate: body.startDate,
      endDate: body.endDate, progress: body.progress, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ target }, { status: 201 });
  } catch (e) {
    console.error('[energy-management/targets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_target' }, { status: 500 });
  }
}
