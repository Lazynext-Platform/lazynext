import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PrintServicesService } from '@/lib/services/print-services-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { jobCount: 0, printerCount: 0, supplyCount: 0, maintenanceCount: 0, byJobType: {}, byJobStatus: {}, byPrinterType: {}, byPrinterStatus: {}, bySupplyType: {}, bySupplyStatus: {}, byMaintenanceType: {}, byMaintenanceStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await PrintServicesService.getPrintServicesStats(organizationId);
  return NextResponse.json({ stats });
}
