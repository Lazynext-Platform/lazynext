import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PresenceService } from '@/lib/services/presence-service';

/**
 * POST /api/presence/heartbeat — record a presence heartbeat.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
    status?: 'online' | 'away' | 'busy' | 'offline';
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  const organizationId = body.organizationId?.trim();

  if (!workspaceId || !organizationId) {
    return NextResponse.json({ error: 'workspaceId_and_organizationId_required' }, { status: 400 });
  }

  const status = body.status || 'online';

  try {
    const ok = await PresenceService.heartbeat(organizationId, workspaceId, session.user.id, status);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error('[presence] heartbeat error:', e);
    return NextResponse.json({ error: 'failed_to_record_heartbeat' }, { status: 500 });
  }
}
