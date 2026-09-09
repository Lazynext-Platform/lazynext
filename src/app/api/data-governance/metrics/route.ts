import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/metrics — get data governance metrics */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: { catalogCoverage: 0, qualityRulePassRate: 0, piiClassificationCoverage: 0, mdmGoldenRecords: 0, lineageCompleteness: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await DataGovernanceService.getDGMetrics(organizationId);
  return NextResponse.json({ metrics });
}
