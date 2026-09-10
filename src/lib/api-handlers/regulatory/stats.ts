import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** GET /api/regulatory/stats — get regulatory stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: {
        filingCount: 0, changeCount: 0, requirementCount: 0, submissionCount: 0,
        monitoringCount: 0, pendingFilingCount: 0, acceptedFilingCount: 0,
        rejectedFilingCount: 0, highImpactChangeCount: 0, activeRequirementCount: 0,
        activeMonitoringCount: 0, byFilingStatus: {}, byChangeStatus: {}, byRequirementStatus: {},
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await RegulatoryService.getStats(organizationId);
  return NextResponse.json({ stats });
}
