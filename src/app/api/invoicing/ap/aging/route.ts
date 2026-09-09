import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { APService } from '@/lib/services/ap-service';

/** GET /api/invoicing/ap/aging — get aging report for payables */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ totalPayables: 0, buckets: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const report = await APService.getAgingReport(organizationId);
  return NextResponse.json(report);
}
