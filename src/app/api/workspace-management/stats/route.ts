import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WorkspaceManagementService } from '@/lib/services/workspace-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { deskCount: 0, roomCount: 0, layoutCount: 0, bookingCount: 0, byDeskType: {}, byDeskStatus: {}, byRoomType: {}, byRoomStatus: {}, byLayoutType: {}, byLayoutStatus: {}, byBookingType: {}, byBookingStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await WorkspaceManagementService.getWorkspaceManagementStats(organizationId);
  return NextResponse.json({ stats });
}
