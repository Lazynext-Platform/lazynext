import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OfficeServicesService } from '@/lib/services/office-services-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { requestCount: 0, mailCount: 0, printJobCount: 0, supplyOrderCount: 0, byRequestType: {}, byRequestStatus: {}, byRequestPriority: {}, byMailType: {}, byMailStatus: {}, byPrintType: {}, byPrintStatus: {}, bySupplyType: {}, bySupplyStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await OfficeServicesService.getOfficeServicesStats(organizationId);
  return NextResponse.json({ stats });
}
