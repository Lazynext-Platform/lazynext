import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/analytics/dashboards — list dashboards (query: organizationId, workspaceId).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || undefined;
  const workspaceId = sp.get('workspaceId') || undefined;

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const dashboards = await AnalyticsService.listDashboards(organizationId, workspaceId || undefined);
    return NextResponse.json({ dashboards });
  } catch (e) {
    console.error('[analytics/dashboards] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_dashboards' }, { status: 500 });
  }
}

/**
 * POST /api/analytics/dashboards — create a dashboard.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    name?: string;
    description?: string;
    workspaceId?: string;
    widgets?: unknown[];
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

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const dashboard = await AnalyticsService.createDashboard(organizationId, {
      name,
      description: body.description?.trim() || undefined,
      workspaceId: body.workspaceId?.trim() || undefined,
      widgets: (body.widgets as Parameters<typeof AnalyticsService.createDashboard>[1]['widgets']) || [],
      createdBy: session.user.id,
    });
    return NextResponse.json({ dashboard }, { status: 201 });
  } catch (e) {
    console.error('[analytics/dashboards] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_dashboard' }, { status: 500 });
  }
}
