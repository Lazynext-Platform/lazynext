import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecordsManagementService } from '@/lib/services/records-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { scheduleCount: 0, itemCount: 0, disposalCount: 0, legalHoldCount: 0, byScheduleType: {}, byScheduleStatus: {}, byItemType: {}, byItemStatus: {}, byDisposalType: {}, byDisposalStatus: {}, byHoldType: {}, byHoldStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await RecordsManagementService.getRecordsManagementStats(organizationId);
  return NextResponse.json({ stats });
}
