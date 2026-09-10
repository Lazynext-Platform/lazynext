import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CarbonManagementService } from '@/lib/services/carbon-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeInventories: 0, activeOffsets: 0, activeTargets: 0, heldCredits: 0, totalOffsetAmount: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await CarbonManagementService.getCarbonManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
