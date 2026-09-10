import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AirQualityManagementService } from '@/lib/services/air-quality-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeSensors: 0, pendingReadings: 0, activeThresholds: 0, activeAlerts: 0, criticalAlerts: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await AirQualityManagementService.getAirQualityManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
