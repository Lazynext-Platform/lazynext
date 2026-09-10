import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseDevelopmentService } from '@/lib/services/franchise-development-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeUnits: 0, executedAgreements: 0, pendingRoyalties: 0, overdueRoyalties: 0, scheduledTraining: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await FranchiseDevelopmentService.getFranchiseDevelopmentMetrics(organizationId);
  return NextResponse.json({ metrics });
}
