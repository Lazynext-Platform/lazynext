import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CalendarService } from '@/lib/services/calendar-service';

/** GET /api/calendar/week — get events for a week */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;
  const dateStr = sp.get('date');
  if (!dateStr) {
    return NextResponse.json({ error: 'date_required' }, { status: 400 });
  }

  const events = await CalendarService.getWeek(organizationId, new Date(dateStr), {
    workspaceId: sp.get('workspaceId') || undefined,
  });

  return NextResponse.json({ events });
}
