import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EnvironmentalComplianceService } from '@/lib/services/environmental-compliance-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activePermits: 0, expiringPermits: 0, totalEmissions: 0, verifiedEmissions: 0, totalWaste: 0, recycledWaste: 0, pendingReports: 0, complianceRate: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await EnvironmentalComplianceService.getEnvironmentalComplianceMetrics(organizationId);
  return NextResponse.json({ metrics });
}
