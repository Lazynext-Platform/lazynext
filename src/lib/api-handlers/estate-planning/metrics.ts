import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EstatePlanningService } from '@/lib/services/estate-planning-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeTrusts: 0, executedWills: 0, activeBeneficiaries: 0, activeExecutors: 0, totalTrustValue: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await EstatePlanningService.getEstatePlanningMetrics(organizationId);
  return NextResponse.json({ metrics });
}
