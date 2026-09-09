import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VisitorManagementService } from '@/lib/services/visitor-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { preRegisteredVisits: 0, checkedInVisitors: 0, activeBadges: 0, activeHosts: 0, flaggedLogs: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await VisitorManagementService.getVisitorManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
