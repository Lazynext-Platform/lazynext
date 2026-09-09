import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngineeringManagementService } from '@/lib/services/engineering-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'team', 'project', 'dateFrom', 'dateTo']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const metrics = await EngineeringManagementService.listMetrics(organizationId, opts as never);
  return NextResponse.json({ metrics });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  const value = Number(body.value);
  const unit = String(body.unit || '').trim();
  if (!type || !unit || isNaN(value)) return NextResponse.json({ error: 'type_value_unit_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const metric = await EngineeringManagementService.createMetric(ws.organizationId, ws.id, {
      type: type as never, value, unit: unit as never,
      period: body.period, team: body.team, project: body.project,
      measuredDate: body.measuredDate, target: body.target, trend: body.trend, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ metric }, { status: 201 });
  } catch (e) {
    console.error('[engineering-management/metrics] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_metric' }, { status: 500 });
  }
}
