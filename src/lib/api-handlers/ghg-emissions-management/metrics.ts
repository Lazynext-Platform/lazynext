import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GHGEmissionsManagementService } from '@/lib/services/ghg-emissions-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { calculatedEmissions: 0, verifiedEmissions: 0, activeFactors: 0, submittedReports: 0, activeSources: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await GHGEmissionsManagementService.getGHGEmissionsManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
