import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KpiService } from '@/lib/services/kpi-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: {"activeDefinitions":0,"activeTargets":0,"recordedMeasurements":0,"activeDashboards":0,"achievedTargets":0} });
  const organizationId = workspaces[0].organizationId;
  const metrics = await KpiService.getKpiMetrics(organizationId);
  return NextResponse.json({ metrics });
}
