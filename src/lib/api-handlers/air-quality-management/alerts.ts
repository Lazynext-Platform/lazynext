import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AirQualityManagementService } from '@/lib/services/air-quality-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ alerts: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['sensorId', 'thresholdId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const alerts = await AirQualityManagementService.listAirAlerts(organizationId, opts as never);
  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const description = String(body.description || '').trim();
  const type = String(body.type || '').trim();
  if (!description || !type) return NextResponse.json({ error: 'description_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const alert = await AirQualityManagementService.createAirAlert(ws.organizationId, ws.id, {
      sensorId: body.sensorId, thresholdId: body.thresholdId, type: type as never,
      description, status: body.status, severity: body.severity,
      triggeredDate: body.triggeredDate, acknowledgedDate: body.acknowledgedDate,
      resolvedDate: body.resolvedDate, acknowledgedBy: body.acknowledgedBy, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ alert }, { status: 201 });
  } catch (e) {
    console.error('[air-quality-management/alerts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_alert' }, { status: 500 });
  }
}
