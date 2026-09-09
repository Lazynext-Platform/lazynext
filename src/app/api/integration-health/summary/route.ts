import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IntegrationHealthMonitor } from '@/lib/automation/health-monitor';

/**
 * GET /api/integration-health/summary — health summary for the user's org.
 * Query: organizationId?
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const orgIds = [...new Set(workspaces.map((w) => w.organizationId))];
    const requestedOrg = sp.get('organizationId');
    const orgId = requestedOrg && orgIds.includes(requestedOrg) ? requestedOrg : orgIds[0];

    if (!orgId) {
      return NextResponse.json({
        summary: { total: 0, healthy: 0, degraded: 0, down: 0, unknown: 0, byType: {} },
      });
    }

    const summary = await IntegrationHealthMonitor.getHealthSummary(orgId);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[integration-health/summary] error:', e);
    return NextResponse.json({ error: 'failed_to_get_health_summary' }, { status: 500 });
  }
}
