import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ReportTemplateService } from '@/lib/services/report-template-service';

/** GET /api/report-templates/stats — get template stats for the organization */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      totalTemplates: 0,
      byCategory: {},
      byDataSource: {},
      builtInTemplates: 0,
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await ReportTemplateService.getStats(organizationId);
  return NextResponse.json(stats);
}
