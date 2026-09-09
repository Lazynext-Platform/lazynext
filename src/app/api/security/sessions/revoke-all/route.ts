import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SessionManagementService } from '@/lib/services/session-management-service';

/** POST /api/security/sessions/revoke-all — revoke all sessions except current */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const exceptSessionId = body.exceptSessionId ? String(body.exceptSessionId) : undefined;

  try {
    const result = await SessionManagementService.revokeAllSessions(
      session.user.id,
      exceptSessionId,
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('[security/sessions/revoke-all] error:', e);
    return NextResponse.json({ error: 'failed_to_revoke_sessions' }, { status: 500 });
  }
}
