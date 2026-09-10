import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityReportingService } from '@/lib/services/sustainability-reporting-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { reportCount: 0, frameworkCount: 0, disclosureCount: 0, assuranceCount: 0, byReportType: {}, byReportStatus: {}, byFrameworkType: {}, byFrameworkStatus: {}, byDisclosureType: {}, byDisclosureStatus: {}, byAssuranceType: {}, byAssuranceStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await SustainabilityReportingService.getSustainabilityReportingStats(organizationId);
  return NextResponse.json({ stats });
}
