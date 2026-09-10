import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PresenceService } from '@/lib/services/presence-service';

/**
 * GET /api/presence/status — get workspace presence.
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
    const presence = await PresenceService.getPresence(workspaceId);
    return NextResponse.json({ presence });
  } catch (e) {
    console.error('[presence] status list error:', e);
    return NextResponse.json({ error: 'failed_to_get_presence' }, { status: 500 });
  }
}

/**
 * PATCH /api/presence/status — set the current user's status.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { status?: 'online' | 'away' | 'busy' | 'offline' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const status = body.status;
  if (!status || !['online', 'away', 'busy', 'offline'].includes(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  try {
    const ok = await PresenceService.setStatus(session.user.id, status);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error('[presence] set status error:', e);
    return NextResponse.json({ error: 'failed_to_set_status' }, { status: 500 });
  }
}
