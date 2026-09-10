import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ImportExportService } from '@/lib/services/import-export-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { shipmentCount: 0, declarationCount: 0, licenseCount: 0, tariffCount: 0, activeShipmentCount: 0, pendingDeclarationCount: 0, activeLicenseCount: 0, activeTariffCount: 0, byShipmentDirection: {}, byShipmentStatus: {}, byDeclarationStatus: {}, byLicenseStatus: {}, byTariffType: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await ImportExportService.getImportExportStats(organizationId);
  return NextResponse.json({ stats });
}
