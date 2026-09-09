import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PlanManagementService } from '@/lib/services/plan-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activePlans: 0, activeEnrollments: 0, activeProviders: 0, pendingClaims: 0, totalClaimAmount: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await PlanManagementService.getPlanManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
