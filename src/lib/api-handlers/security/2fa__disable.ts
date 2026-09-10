import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TwoFactorService } from '@/lib/services/two-factor-service';

/** POST /api/security/2fa/disable — disable 2FA */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = body.code ? String(body.code) : undefined;

  try {
    const result = await TwoFactorService.disable(session.user.id, code);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed_to_disable_2fa';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
