import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { revokeAllUserSessions } from '@/lib/session-revocation';
import { safeError } from '@/lib/security';

/**
 * POST /api/session/revoke-all — Revoke all sessions for the current user.
 * This is a "logout all devices" action. The user's current session is also
 * revoked — the client should redirect to /login after calling this.
 *
 * Requires authentication. Also revokes sessions when a user changes their
 * password or enables/disables MFA.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const count = await revokeAllUserSessions(session.user.id);
    return NextResponse.json({ revoked: count });
  } catch (e) {
    return NextResponse.json(safeError(e, 'session_revoke_all', 'revoke_failed'), { status: 500 });
  }
}
