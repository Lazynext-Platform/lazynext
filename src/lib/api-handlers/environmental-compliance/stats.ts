import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EnvironmentalComplianceService } from '@/lib/services/environmental-compliance-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { permitCount: 0, activePermitCount: 0, emissionCount: 0, verifiedEmissionCount: 0, wasteCount: 0, recycledWasteCount: 0, reportCount: 0, submittedReportCount: 0, byPermitType: {}, byPermitStatus: {}, byEmissionType: {}, byEmissionScope: {}, byEmissionStatus: {}, byWasteType: {}, byWasteStatus: {}, byReportType: {}, byReportStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await EnvironmentalComplianceService.getEnvironmentalComplianceStats(organizationId);
  return NextResponse.json({ stats });
}
