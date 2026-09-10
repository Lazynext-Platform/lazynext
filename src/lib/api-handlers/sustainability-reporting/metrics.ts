import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityReportingService } from '@/lib/services/sustainability-reporting-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { publishedReports: 0, activeFrameworks: 0, publishedDisclosures: 0, completedAssurances: 0, draftReports: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await SustainabilityReportingService.getSustainabilityReportingMetrics(organizationId);
  return NextResponse.json({ metrics });
}
