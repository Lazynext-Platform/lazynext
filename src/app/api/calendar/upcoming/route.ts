import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CalendarService } from '@/lib/services/calendar-service';

/** GET /api/calendar/upcoming — get upcoming events */
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

  const events = await CalendarService.getUpcoming(organizationId, {
    workspaceId: sp.get('workspaceId') || undefined,
    userId: sp.get('userId') || undefined,
    days: sp.get('days') ? parseInt(sp.get('days')!, 10) : undefined,
    limit: sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined,
  });

  return NextResponse.json({ events });
}
