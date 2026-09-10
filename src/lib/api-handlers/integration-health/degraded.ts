import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IntegrationHealthMonitor } from '@/lib/automation/health-monitor';

/**
 * GET /api/integration-health/degraded — degraded integrations for the user's org.
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
      return NextResponse.json({ integrations: [] });
    }

    const integrations = await IntegrationHealthMonitor.getDegradedIntegrations(orgId);
    return NextResponse.json({ integrations });
  } catch (e) {
    console.error('[integration-health/degraded] error:', e);
    return NextResponse.json({ error: 'failed_to_get_degraded_integrations' }, { status: 500 });
  }
}
