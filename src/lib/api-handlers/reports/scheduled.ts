import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ReportBuilderService } from '@/lib/services/report-builder-service';

/** GET /api/reports/scheduled — get all scheduled reports */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ reports: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const reports = await ReportBuilderService.getScheduled(organizationId);
  return NextResponse.json({ reports });
}
