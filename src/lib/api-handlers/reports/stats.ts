import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ReportBuilderService } from '@/lib/services/report-builder-service';

/** GET /api/reports/stats — get report stats for the organization */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      totalReports: 0,
      byDataSource: {},
      bySchedule: {},
      totalExecutions: 0,
      scheduledReports: 0,
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await ReportBuilderService.getStats(organizationId);
  return NextResponse.json(stats);
}
