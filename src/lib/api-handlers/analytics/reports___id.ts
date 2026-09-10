import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/analytics/reports/[id] — get a report by ID.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const report = await AnalyticsService.getReport(id);
    if (!report) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === report.organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json({ report });
  } catch (e) {
    console.error('[analytics/reports] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_report' }, { status: 500 });
  }
}

/**
 * PATCH /api/analytics/reports/[id] — update a report.
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
    sections?: unknown[];
    schedule?: { frequency: string; cron?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const existing = await AnalyticsService.getReport(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === existing.organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const report = await AnalyticsService.updateReport(id, {
      name: body.name?.trim(),
      description: body.description?.trim(),
      sections: body.sections as Parameters<typeof AnalyticsService.updateReport>[1]['sections'],
      schedule: body.schedule,
    });
    return NextResponse.json({ report });
  } catch (e) {
    console.error('[analytics/reports] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_report' }, { status: 500 });
  }
}

/**
 * DELETE /api/analytics/reports/[id] — delete a report.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const existing = await AnalyticsService.getReport(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === existing.organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const ok = await AnalyticsService.deleteReport(id);
    return NextResponse.json({ deleted: ok });
  } catch (e) {
    console.error('[analytics/reports] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_report' }, { status: 500 });
  }
}
