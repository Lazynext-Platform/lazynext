import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CalendarService } from '@/lib/services/calendar-service';

/** GET /api/calendar/gantt — get Gantt chart data */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const data = await CalendarService.getGanttData(organizationId, {
    workspaceId: sp.get('workspaceId') || undefined,
  });

  return NextResponse.json(data);
}
