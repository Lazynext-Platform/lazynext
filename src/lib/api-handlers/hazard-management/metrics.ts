import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { HazardManagementService } from '@/lib/services/hazard-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { identifiedHazards: 0, activeAssessments: 0, implementedControls: 0, activeJSAs: 0, highRiskHazards: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await HazardManagementService.getHazardManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
