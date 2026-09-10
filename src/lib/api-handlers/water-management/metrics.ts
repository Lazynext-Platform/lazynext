import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WaterManagementService } from '@/lib/services/water-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeMeters: 0, pendingReadings: 0, pendingTests: 0, activePrograms: 0, totalConsumption: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await WaterManagementService.getWaterManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
