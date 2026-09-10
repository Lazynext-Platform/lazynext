import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CalendarService } from '@/lib/services/calendar-service';

/** GET /api/calendar/month — get events for a month */
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
  const yearStr = sp.get('year');
  const monthStr = sp.get('month');
  if (!yearStr || !monthStr) {
    return NextResponse.json({ error: 'year_month_required' }, { status: 400 });
  }

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    return NextResponse.json({ error: 'invalid_year_month' }, { status: 400 });
  }

  const events = await CalendarService.getMonth(organizationId, year, month, {
    workspaceId: sp.get('workspaceId') || undefined,
  });

  return NextResponse.json({ events });
}
