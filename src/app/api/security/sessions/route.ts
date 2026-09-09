import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SessionManagementService } from '@/lib/services/session-management-service';

/** GET /api/security/sessions — list active sessions */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const [sessions, devices] = await Promise.all([
      SessionManagementService.listSessions(session.user.id),
      SessionManagementService.getActiveDevices(session.user.id),
    ]);
    return NextResponse.json({ sessions, devices });
  } catch (e) {
    console.error('[security/sessions] error:', e);
    return NextResponse.json({ error: 'failed_to_list_sessions' }, { status: 500 });
  }
}
