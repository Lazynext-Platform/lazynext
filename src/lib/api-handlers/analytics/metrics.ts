import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/analytics/metrics — list metrics with filters.
 * Query: organizationId, workspaceId?, name?, since?, until?, limit?
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || undefined;
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  try {
    // Verify the user has access to a workspace in this organization
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const since = sp.get('since') ? new Date(sp.get('since')!) : undefined;
    const until = sp.get('until') ? new Date(sp.get('until')!) : undefined;
    const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined;

    const metrics = await AnalyticsService.listMetrics(organizationId, {
      workspaceId: sp.get('workspaceId') || undefined,
      name: sp.get('name') || undefined,
      since,
      until,
      limit,
    });
    return NextResponse.json({ metrics });
  } catch (e) {
    console.error('[analytics/metrics] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_metrics' }, { status: 500 });
  }
}

/**
 * POST /api/analytics/metrics — record a new metric.
 * Body: { organizationId, workspaceId?, name, value, unit?, dimensions?, timestamp? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    name?: string;
    value?: number;
    unit?: string;
    dimensions?: Record<string, unknown>;
    timestamp?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  if (typeof body.value !== 'number' || !Number.isFinite(body.value)) {
    return NextResponse.json({ error: 'value_required' }, { status: 400 });
  }

  try {
    // Verify the user has access to a workspace in this organization
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    let timestamp: Date | undefined;
    if (body.timestamp) {
      const parsed = new Date(body.timestamp);
      if (!isNaN(parsed.getTime())) timestamp = parsed;
    }

    const metric = await AnalyticsService.recordMetric(organizationId, {
      workspaceId: body.workspaceId?.trim() || undefined,
      name,
      value: body.value,
      unit: body.unit?.trim() || undefined,
      dimensions: body.dimensions,
      timestamp,
    });
    return NextResponse.json({ metric }, { status: 201 });
  } catch (e) {
    console.error('[analytics/metrics] create error:', e);
    return NextResponse.json({ error: 'failed_to_record_metric' }, { status: 500 });
  }
}
