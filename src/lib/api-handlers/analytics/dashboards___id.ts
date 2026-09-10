import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/analytics/dashboards/[id] — get a dashboard by ID.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const dashboard = await AnalyticsService.getDashboard(id);
    if (!dashboard) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === dashboard.organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json({ dashboard });
  } catch (e) {
    console.error('[analytics/dashboards] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_dashboard' }, { status: 500 });
  }
}

/**
 * PATCH /api/analytics/dashboards/[id] — update a dashboard.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    name?: string;
    description?: string;
    widgets?: unknown[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const existing = await AnalyticsService.getDashboard(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === existing.organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const dashboard = await AnalyticsService.updateDashboard(id, {
      name: body.name?.trim(),
      description: body.description?.trim(),
      widgets: body.widgets as Parameters<typeof AnalyticsService.updateDashboard>[1]['widgets'],
    });
    return NextResponse.json({ dashboard });
  } catch (e) {
    console.error('[analytics/dashboards] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_dashboard' }, { status: 500 });
  }
}

/**
 * DELETE /api/analytics/dashboards/[id] — delete a dashboard.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const existing = await AnalyticsService.getDashboard(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === existing.organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const ok = await AnalyticsService.deleteDashboard(id);
    return NextResponse.json({ deleted: ok });
  } catch (e) {
    console.error('[analytics/dashboards] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_dashboard' }, { status: 500 });
  }
}
