import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TwoFactorService } from '@/lib/services/two-factor-service';

/** POST /api/security/2fa/verify — verify code and enable 2FA */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').trim();
  if (!code) {
    return NextResponse.json({ error: 'code_required' }, { status: 400 });
  }

  try {
    const result = await TwoFactorService.verify(session.user.id, code);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed_to_verify_2fa';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
