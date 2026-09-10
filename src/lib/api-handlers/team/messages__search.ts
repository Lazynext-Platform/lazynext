import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MessageService } from '@/lib/services/message-service';

/** GET /api/team/messages/search — search messages */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const query = sp.get('q') || '';
  if (!query) {
    return NextResponse.json({ messages: [] });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ messages: [] });
  }

  const organizationId = workspaces[0].organizationId;

  const messages = await MessageService.search(organizationId, query, {
    channelId: sp.get('channelId') || undefined,
    userId: sp.get('userId') || undefined,
    startDate: sp.get('startDate') ? new Date(sp.get('startDate')!) : undefined,
    endDate: sp.get('endDate') ? new Date(sp.get('endDate')!) : undefined,
    limit: sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined,
  });

  return NextResponse.json({ messages });
}
