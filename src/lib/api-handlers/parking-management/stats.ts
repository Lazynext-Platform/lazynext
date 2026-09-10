import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ParkingManagementService } from '@/lib/services/parking-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { spotCount: 0, permitCount: 0, allocationCount: 0, visitorParkingCount: 0, bySpotType: {}, bySpotStatus: {}, byPermitType: {}, byPermitStatus: {}, byAllocationType: {}, byAllocationStatus: {}, byVisitorParkingType: {}, byVisitorParkingStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await ParkingManagementService.getParkingManagementStats(organizationId);
  return NextResponse.json({ stats });
}
