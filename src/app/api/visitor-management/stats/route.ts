import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VisitorManagementService } from '@/lib/services/visitor-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { visitCount: 0, badgeCount: 0, hostCount: 0, logCount: 0, byVisitType: {}, byVisitStatus: {}, byBadgeType: {}, byBadgeStatus: {}, byHostType: {}, byHostStatus: {}, byLogType: {}, byLogStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await VisitorManagementService.getVisitorManagementStats(organizationId);
  return NextResponse.json({ stats });
}
