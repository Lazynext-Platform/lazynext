import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SessionManagementService } from '@/lib/services/session-management-service';

/** GET /api/security/suspicious — check for suspicious activity */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await SessionManagementService.detectSuspiciousActivity(session.user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[security/suspicious] error:', e);
    return NextResponse.json({ error: 'failed_to_check_suspicious_activity' }, { status: 500 });
  }
}
