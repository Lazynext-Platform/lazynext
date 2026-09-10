import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PresenceService } from '@/lib/services/presence-service';

/**
 * GET /api/presence/stats — get presence stats for a workspace.
 * Query: workspaceId
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    const stats = await PresenceService.getStats(workspaceId);
    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[presence] stats error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
