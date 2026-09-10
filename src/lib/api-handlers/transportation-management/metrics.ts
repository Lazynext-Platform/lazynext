import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TransportationManagementService } from '@/lib/services/transportation-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeVehicles: 0, activeRoutes: 0, activeAssignments: 0, activeTrips: 0, completedTrips: 0, cancelledTrips: 0, totalVehicles: 0, totalRoutes: 0, totalAssignments: 0, totalTrips: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await TransportationManagementService.getTransportationManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
