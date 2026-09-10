import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OccupationalHealthService } from '@/lib/services/occupational-health-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ exposures: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const exposures = await OccupationalHealthService.listHealthExposures(organizationId, opts as never);
  return NextResponse.json({ exposures });
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
    const exposure = await OccupationalHealthService.createHealthExposure(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, employeeId: body.employeeId,
      employeeName: body.employeeName, source: body.source, level: body.level, unit: body.unit,
      exposureDate: body.exposureDate, duration: body.duration, severity: body.severity, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ exposure }, { status: 201 });
  } catch (e) {
    console.error('[occupational-health/exposures] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_exposure' }, { status: 500 });
  }
}
