import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ARService } from '@/lib/services/ar-service';

/** GET /api/invoicing/ar/aging — get aging report for receivables */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      totalOutstanding: 0,
      totalOverdue: 0,
      buckets: [],
    });
  }

  const organizationId = workspaces[0].organizationId;
  const report = await ARService.getAgingReport(organizationId);
  return NextResponse.json(report);
}
