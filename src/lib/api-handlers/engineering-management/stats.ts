import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngineeringManagementService } from '@/lib/services/engineering-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { metricCount: 0, sprintCount: 0, qualityCount: 0, healthCount: 0, activeSprintCount: 0, byMetricType: {}, bySprintStatus: {}, byQualityType: {}, byQualityStatus: {}, byHealthCategory: {}, byHealthStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await EngineeringManagementService.getEngineeringStats(organizationId);
  return NextResponse.json({ stats });
}
