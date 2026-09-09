import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngineeringManagementService } from '@/lib/services/engineering-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { averageVelocity: 0, deploymentFrequency: 0, codeCoverage: 0, mttr: 0, activeSprints: 0, healthSummary: {} } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await EngineeringManagementService.getEngineeringMetrics(organizationId);
  return NextResponse.json({ metrics });
}
