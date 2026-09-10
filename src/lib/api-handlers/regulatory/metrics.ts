import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/metrics — get regulatory metrics */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      metrics: {
        pendingFilings: 0, upcomingDeadlines: 0, highImpactChanges: 0,
        complianceRate: 0, monitoringCoverage: 0, activeRequirements: 0, openSubmissions: 0,
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await RegulatoryService.getRegulatoryMetrics(organizationId);
  return NextResponse.json({ metrics });
}
