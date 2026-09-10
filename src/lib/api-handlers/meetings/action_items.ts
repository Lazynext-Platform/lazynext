import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MeetingService } from '@/lib/services/meeting-service';

/** GET /api/meetings/action-items — get all action items across meetings */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ actionItems: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const filters: {
    status?: string;
    assignee?: string;
    dateRange?: { start: Date; end: Date };
  } = {};
  const status = url.searchParams.get('status');
  const assignee = url.searchParams.get('assignee');
  const dateStart = url.searchParams.get('dateStart');
  const dateEnd = url.searchParams.get('dateEnd');
  if (status) filters.status = status;
  if (assignee) filters.assignee = assignee;
  if (dateStart && dateEnd) {
    filters.dateRange = { start: new Date(dateStart), end: new Date(dateEnd) };
  }

  const actionItems = await MeetingService.getActionItems(organizationId, filters);
  return NextResponse.json({ actionItems });
}
