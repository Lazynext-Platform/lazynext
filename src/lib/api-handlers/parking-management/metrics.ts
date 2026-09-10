import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ParkingManagementService } from '@/lib/services/parking-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { totalSpots: 0, availableSpots: 0, activePermits: 0, activeVisitorParking: 0, pendingPermits: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await ParkingManagementService.getParkingManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
