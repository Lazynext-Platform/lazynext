import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SessionManagementService } from '@/lib/services/session-management-service';

/** GET /api/security/login-history — get login history */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  try {
    const history = await SessionManagementService.getLoginHistory(session.user.id, { limit, offset });
    return NextResponse.json({ history });
  } catch (e) {
    console.error('[security/login-history] error:', e);
    return NextResponse.json({ error: 'failed_to_get_login_history' }, { status: 500 });
  }
}
