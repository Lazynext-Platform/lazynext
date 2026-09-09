import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TwoFactorService } from '@/lib/services/two-factor-service';

/** POST /api/security/2fa/setup — initiate 2FA setup */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const accountName = String(body.accountName || session.user.email || session.user.id);

  try {
    const result = await TwoFactorService.setup(session.user.id, accountName);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[security/2fa/setup] error:', e);
    return NextResponse.json({ error: 'failed_to_setup_2fa' }, { status: 500 });
  }
}
