import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TransportationManagementService } from '@/lib/services/transportation-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { vehicleCount: 0, routeCount: 0, assignmentCount: 0, tripCount: 0, byVehicleType: {}, byVehicleStatus: {}, byRouteType: {}, byRouteStatus: {}, byAssignmentStatus: {}, byTripType: {}, byTripStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await TransportationManagementService.getTransportationManagementStats(organizationId);
  return NextResponse.json({ stats });
}
