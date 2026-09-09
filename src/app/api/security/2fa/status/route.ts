import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TwoFactorService } from '@/lib/services/two-factor-service';

/** GET /api/security/2fa/status — get 2FA status */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const status = await TwoFactorService.getStatus(session.user.id);
    return NextResponse.json(status);
  } catch (e) {
    console.error('[security/2fa/status] error:', e);
    return NextResponse.json({ error: 'failed_to_get_status' }, { status: 500 });
  }
}
