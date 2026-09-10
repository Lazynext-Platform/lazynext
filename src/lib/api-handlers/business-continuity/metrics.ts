import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BusinessContinuityService } from '@/lib/services/business-continuity-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activePlans: 0, implementedStrategies: 0, completedBIAs: 0, scheduledTests: 0, completedTests: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await BusinessContinuityService.getBusinessContinuityMetrics(organizationId);
  return NextResponse.json({ metrics });
}
