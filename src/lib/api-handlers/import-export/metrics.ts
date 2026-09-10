import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ImportExportService } from '@/lib/services/import-export-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeShipments: 0, pendingDeclarations: 0, activeLicenses: 0, activeTariffs: 0, shipmentClearanceRate: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await ImportExportService.getImportExportMetrics(organizationId);
  return NextResponse.json({ metrics });
}
