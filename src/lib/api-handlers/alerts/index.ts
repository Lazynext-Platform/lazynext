import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AlertService } from '@/lib/services/alert-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/alerts — list alerts.
 * Query params: status, severity, metricName, limit
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') || undefined;
  const severity = sp.get('severity') || undefined;
  const metricName = sp.get('metricName') || undefined;
  const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ alerts: [] });
    }
    const organizationId = workspaces[0].organizationId;

    const alerts = await AlertService.listAlerts(organizationId, { status, severity, metricName, limit });
    return NextResponse.json({ alerts });
  } catch (e) {
    console.error('[alerts] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_alerts' }, { status: 500 });
  }
}

/**
 * POST /api/alerts — create an alert.
 * Body: { organizationId?, workspaceId?, name, description?, severity?, source?, metricName?, condition?, threshold?, metadata? }
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
    description?: string;
    severity?: string;
    source?: string;
    metricName?: string;
    condition?: Record<string, unknown>;
    threshold?: number;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
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

    const alert = await AlertService.createAlert(organizationId, {
      workspaceId: body.workspaceId?.trim() || undefined,
      name: body.name.trim(),
      description: body.description,
      severity: body.severity,
      source: body.source,
      metricName: body.metricName,
      condition: body.condition,
      threshold: body.threshold,
      metadata: body.metadata,
    });
    return NextResponse.json({ alert }, { status: 201 });
  } catch (e) {
    console.error('[alerts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_alert' }, { status: 500 });
  }
}
