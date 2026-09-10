import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KpiService } from '@/lib/services/kpi-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: {"definitionCount":0,"targetCount":0,"measurementCount":0,"dashboardCount":0,"byDefinitionType":{},"byDefinitionStatus":{},"byTargetType":{},"byTargetStatus":{},"byMeasurementType":{},"byMeasurementStatus":{},"byDashboardType":{},"byDashboardStatus":{}} });
  const organizationId = workspaces[0].organizationId;
  const stats = await KpiService.getKpiStats(organizationId);
  return NextResponse.json({ stats });
}
