import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/metrics — get franchise metrics */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: { activeFranchisees: 0, totalRoyalties: 0, complianceRate: 0, avgRoyaltyRate: 0, openComplianceIssues: 0, expiringAgreements: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await FranchiseService.getFranchiseMetrics(organizationId);
  return NextResponse.json({ metrics });
}
