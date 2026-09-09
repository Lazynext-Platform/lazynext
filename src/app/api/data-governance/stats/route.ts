import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/stats — get data governance stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { catalogCount: 0, qualityRuleCount: 0, lineageCount: 0, stewardshipCount: 0, mdmRecordCount: 0, piiCount: 0, activeCatalogCount: 0, qualityRulePassRate: 0, byCatalogType: {}, byClassification: {}, byMDMDomain: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await DataGovernanceService.getStats(organizationId);
  return NextResponse.json({ stats });
}
