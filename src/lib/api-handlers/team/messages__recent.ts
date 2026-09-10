import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MessageService } from '@/lib/services/message-service';

/** GET /api/team/messages/recent — get recent messages across all channels */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ messages: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const messages = await MessageService.getRecent(organizationId, {
    workspaceId: sp.get('workspaceId') || undefined,
    userId: sp.get('userId') || undefined,
    limit: sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined,
  });

  return NextResponse.json({ messages });
}
