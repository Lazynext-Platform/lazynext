import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecordsManagementService } from '@/lib/services/records-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeSchedules: 0, activeItems: 0, archivedItems: 0, pendingDisposals: 0, activeHolds: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await RecordsManagementService.getRecordsManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
