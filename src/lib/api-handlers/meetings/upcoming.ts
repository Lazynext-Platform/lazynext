import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MeetingService } from '@/lib/services/meeting-service';

/** GET /api/meetings/upcoming — get upcoming meetings */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ meetings: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '7', 10);

  const meetings = await MeetingService.getUpcoming(organizationId, days);
  return NextResponse.json({ meetings });
}
