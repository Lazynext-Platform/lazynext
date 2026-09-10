import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WasteManagementService } from '@/lib/services/waste-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { streamCount: 0, programCount: 0, disposalCount: 0, vendorCount: 0, byStreamType: {}, byStreamStatus: {}, byProgramType: {}, byProgramStatus: {}, byDisposalType: {}, byDisposalStatus: {}, byVendorType: {}, byVendorStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await WasteManagementService.getWasteManagementStats(organizationId);
  return NextResponse.json({ stats });
}
