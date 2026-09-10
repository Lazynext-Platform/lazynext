import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PlanManagementService } from '@/lib/services/plan-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { planCount: 0, activePlanCount: 0, enrollmentCount: 0, activeEnrollmentCount: 0, providerCount: 0, activeProviderCount: 0, claimCount: 0, pendingClaimCount: 0, byPlanType: {}, byPlanStatus: {}, byEnrollmentType: {}, byEnrollmentStatus: {}, byProviderType: {}, byProviderStatus: {}, byClaimType: {}, byClaimStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await PlanManagementService.getPlanManagementStats(organizationId);
  return NextResponse.json({ stats });
}
