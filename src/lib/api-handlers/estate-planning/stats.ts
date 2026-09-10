import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EstatePlanningService } from '@/lib/services/estate-planning-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { trustCount: 0, activeTrustCount: 0, willCount: 0, executedWillCount: 0, beneficiaryCount: 0, activeBeneficiaryCount: 0, executorCount: 0, activeExecutorCount: 0, byTrustType: {}, byTrustStatus: {}, byWillType: {}, byWillStatus: {}, byBeneficiaryType: {}, byBeneficiaryStatus: {}, byExecutorType: {}, byExecutorStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await EstatePlanningService.getEstatePlanningStats(organizationId);
  return NextResponse.json({ stats });
}
