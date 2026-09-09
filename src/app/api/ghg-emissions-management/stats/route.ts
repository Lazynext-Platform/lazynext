import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GHGEmissionsManagementService } from '@/lib/services/ghg-emissions-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { emissionCount: 0, factorCount: 0, reportCount: 0, sourceCount: 0, byEmissionType: {}, byEmissionStatus: {}, byFactorType: {}, byFactorStatus: {}, byReportType: {}, byReportStatus: {}, bySourceType: {}, bySourceStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await GHGEmissionsManagementService.getGHGEmissionsManagementStats(organizationId);
  return NextResponse.json({ stats });
}
