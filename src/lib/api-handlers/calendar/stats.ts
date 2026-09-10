import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CalendarService } from '@/lib/services/calendar-service';

/** GET /api/calendar/stats — get calendar stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ total: 0, byType: {}, byStatus: {}, upcoming: 0, meetingHours: 0 });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const stats = await CalendarService.getStats(organizationId, {
    workspaceId: sp.get('workspaceId') || undefined,
    startDate: sp.get('startDate') ? new Date(sp.get('startDate')!) : undefined,
    endDate: sp.get('endDate') ? new Date(sp.get('endDate')!) : undefined,
  });

  return NextResponse.json(stats);
}
