import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WorkspaceManagementService } from '@/lib/services/workspace-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeDesks: 0, availableRooms: 0, activeBookings: 0, pendingBookings: 0, maintainedDesks: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await WorkspaceManagementService.getWorkspaceManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
