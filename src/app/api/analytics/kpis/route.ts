import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/analytics/kpis — KPI summary with progress.
 * Query: organizationId
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

    const kpis = await AnalyticsService.getKpiSummary(organizationId);
    return NextResponse.json({ kpis });
  } catch (e) {
    console.error('[analytics/kpis] error:', e);
    return NextResponse.json({ error: 'failed_to_get_kpis' }, { status: 500 });
  }
}
