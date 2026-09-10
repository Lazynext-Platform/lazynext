import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SupportService } from '@/lib/services/support';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/tickets/sla — get SLA status (breaching or at-risk tickets).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ tickets: [] });
    }

    let wsId = workspaceId;
    if (wsId) {
      const hasAccess = workspaces.some((w) => w.id === wsId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      wsId = workspaces[0].id;
    }

    const tickets = await SupportService.getSlaStatus(wsId);
    return NextResponse.json({ tickets });
  } catch (e) {
    console.error('[tickets] sla error:', e);
    return NextResponse.json({ error: 'failed_to_get_sla_status' }, { status: 500 });
  }
}
