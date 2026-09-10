import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TelemetryService } from '@/lib/services/telemetry';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/telemetry — query telemetry points.
 * Query params: metricName, workspaceId, startTime, endTime, labels, limit, orderBy
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const metricName = sp.get('metricName') || undefined;
  const workspaceId = sp.get('workspaceId') || undefined;
  const startTime = sp.get('startTime') ? new Date(sp.get('startTime')!) : undefined;
  const endTime = sp.get('endTime') ? new Date(sp.get('endTime')!) : undefined;
  const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined;
  const orderBy = (sp.get('orderBy') as 'asc' | 'desc') || undefined;
  let labels: Record<string, unknown> | undefined;
  const labelsParam = sp.get('labels');
  if (labelsParam) {
    try { labels = JSON.parse(labelsParam); } catch { /* ignore */ }
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ points: [] });
    }
    const organizationId = workspaces[0].organizationId;

    const points = await TelemetryService.queryPoints(organizationId, {
      metricName,
      workspaceId,
      startTime,
      endTime,
      labels,
      limit,
      orderBy,
    });
    return NextResponse.json({ points });
  } catch (e) {
    console.error('[telemetry] query error:', e);
    return NextResponse.json({ error: 'failed_to_query_telemetry' }, { status: 500 });
  }
}

/**
 * POST /api/telemetry — record a single telemetry data point.
 * Body: { organizationId?, workspaceId?, metricName, metricType?, value, unit?, labels?, traceId?, spanId? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    metricName?: string;
    metricType?: string;
    value?: number;
    unit?: string;
    labels?: Record<string, unknown>;
    traceId?: string;
    spanId?: string;
    timestamp?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.metricName?.trim()) {
    return NextResponse.json({ error: 'metricName_required' }, { status: 400 });
  }
  if (body.value === undefined || body.value === null || Number.isNaN(body.value)) {
    return NextResponse.json({ error: 'value_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    let organizationId = body.organizationId?.trim();
    if (organizationId) {
      const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      organizationId = workspaces[0].organizationId;
    }

    const point = await TelemetryService.recordPoint(organizationId, {
      workspaceId: body.workspaceId?.trim() || undefined,
      metricName: body.metricName.trim(),
      metricType: body.metricType,
      value: body.value,
      unit: body.unit,
      labels: body.labels,
      traceId: body.traceId,
      spanId: body.spanId,
      timestamp: body.timestamp ? new Date(body.timestamp) : undefined,
    });
    return NextResponse.json({ point }, { status: 201 });
  } catch (e) {
    console.error('[telemetry] record error:', e);
    return NextResponse.json({ error: 'failed_to_record_telemetry' }, { status: 500 });
  }
}
