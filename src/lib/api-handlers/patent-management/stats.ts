import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PatentManagementService } from '@/lib/services/patent-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { applicationCount: 0, documentCount: 0, licenseCount: 0, maintenanceCount: 0, byApplicationType: {}, byApplicationStatus: {}, byLicenseType: {}, byLicenseStatus: {}, byMaintenanceType: {}, byMaintenanceStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await PatentManagementService.getPatentManagementStats(organizationId);
  return NextResponse.json({ stats });
}
